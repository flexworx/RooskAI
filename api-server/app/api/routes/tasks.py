"""Proxmox task tracking endpoints — poll async UPID operations.

All VM create/clone/resize/snapshot operations return a UPID. Use these
endpoints to poll completion status without blocking the original request.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from urllib.parse import unquote

from app.core.security import get_current_user
from app.services.proxmox import proxmox_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/{upid:path}")
async def get_task_status(
    upid: str,
    node: str = "r7625",
    include_log: bool = False,
    user: dict = Depends(get_current_user),
):
    """Poll the status of a Proxmox async task by UPID.

    Returns status: 'running' | 'stopped', and exitstatus: 'OK' | error string.
    Poll this endpoint after any VM create/clone/resize/snapshot action.

    Args:
        upid: The UPID returned by a Proxmox task (URL-encoded if it contains colons).
        node: Proxmox node name (default: r7625).
        include_log: If true, also return the last 50 lines of task log output.
    """
    upid = unquote(upid)
    try:
        status = await proxmox_client.get_task_status(upid, node)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch task status: {e}")

    result: dict = {
        "upid": upid,
        "node": node,
        "status": status.get("status"),       # "running" | "stopped"
        "exit_status": status.get("exitstatus"),  # "OK" | error string (only when stopped)
        "type": status.get("type"),           # e.g. "qmcreate", "qmclone"
        "start_time": status.get("starttime"),
        "end_time": status.get("endtime"),
        "user": status.get("user"),
        "succeeded": status.get("status") == "stopped" and status.get("exitstatus") == "OK",
        "failed": status.get("status") == "stopped" and status.get("exitstatus") != "OK",
    }

    if include_log:
        try:
            log = await proxmox_client.get_task_log(upid, node)
            result["log"] = [line.get("t", "") for line in log]
        except Exception as e:
            logger.warning(f"Could not fetch task log for {upid}: {e}")
            result["log"] = []

    return result


@router.get("/")
async def list_recent_tasks(
    node: str = "r7625",
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """List recent Proxmox tasks on the node (up to 50)."""
    try:
        tasks = await proxmox_client.list_tasks(node, limit=min(limit, 100))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch tasks: {e}")

    return {
        "node": node,
        "tasks": [
            {
                "upid": t.get("upid"),
                "type": t.get("type"),
                "status": t.get("status"),
                "exit_status": t.get("exitstatus"),
                "start_time": t.get("starttime"),
                "end_time": t.get("endtime"),
                "user": t.get("user"),
            }
            for t in tasks
        ],
    }
