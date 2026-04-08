"""LXC container management endpoints — Proxmox VE 9.1.

LXC containers are lighter than full VMs — ideal for isolated services,
dev sandboxes, and microservice deployments on the R7625.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.security import get_current_user, require_role
from app.services.proxmox import proxmox_client

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lxc", tags=["LXC Containers"])


class LXCCreate(BaseModel):
    vmid: int | None = Field(None, description="Container ID (auto-assigned if omitted)")
    hostname: str = Field(min_length=1, max_length=64)
    ostemplate: str = Field(
        default="local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst",
        description="Storage path to OS template",
    )
    storage: str = Field(default="nexgen-vms")
    rootfs_gb: int = Field(default=20, ge=4, le=2000)
    memory_mb: int = Field(default=2048, ge=256, le=131072)
    swap_mb: int = Field(default=512, ge=0)
    cpu_cores: int = Field(default=2, ge=1, le=128)
    vlan: int = Field(default=30, ge=10, le=50, description="VLAN bridge number (10/20/30/40/50)")
    ip_address: str | None = Field(None, description="Static IP in CIDR notation, e.g. 10.30.0.50/24")
    gateway: str | None = Field(None, description="Gateway IP")
    password: str | None = Field(None, description="Root password (omit to use SSH key only)")
    ssh_public_key: str | None = Field(None, description="SSH public key for root access")
    unprivileged: bool = Field(default=True, description="Run as unprivileged container (recommended)")
    tags: list[str] = Field(default_factory=list)


class LXCAction(BaseModel):
    action: str = Field(description="start | stop | restart | delete")
    parameters: dict = Field(default_factory=dict)


@router.get("/")
async def list_containers(
    node: str = "r7625",
    user: dict = Depends(get_current_user),
):
    """List all LXC containers with live status from Proxmox."""
    try:
        containers = await proxmox_client.list_containers(node)
        return {
            "node": node,
            "containers": sorted(containers, key=lambda c: c.get("vmid", 0)),
            "total": len(containers),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to list containers: {e}")


@router.get("/templates")
async def list_templates(
    storage: str = "local",
    node: str = "r7625",
    user: dict = Depends(get_current_user),
):
    """List available LXC OS templates on a storage volume."""
    try:
        templates = await proxmox_client.list_storage_content(storage, "vztmpl", node)
        return {
            "storage": storage,
            "templates": [
                {
                    "volid": t.get("volid"),
                    "size": t.get("size"),
                    "ctime": t.get("ctime"),
                }
                for t in templates
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to list templates: {e}")


@router.get("/{vmid}")
async def get_container(
    vmid: int,
    node: str = "r7625",
    user: dict = Depends(get_current_user),
):
    """Get status and config for a specific LXC container."""
    try:
        status_data = await proxmox_client.get_container_status(vmid, node)
        config = await proxmox_client.get_container_config(vmid, node)
        return {
            "vmid": vmid,
            "node": node,
            "status": status_data.get("status"),
            "cpu_percent": round((status_data.get("cpu", 0) or 0) * 100, 1),
            "mem_used_mb": round((status_data.get("mem", 0) or 0) / (1024 ** 2), 1),
            "mem_total_mb": round((status_data.get("maxmem", 0) or 0) / (1024 ** 2), 1),
            "uptime": status_data.get("uptime", 0),
            "hostname": config.get("hostname"),
            "ostype": config.get("ostype"),
            "unprivileged": config.get("unprivileged", 0),
            "cores": config.get("cores"),
            "memory": config.get("memory"),
            "swap": config.get("swap"),
            "tags": [t for t in (config.get("tags") or "").split(";") if t],
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get container {vmid}: {e}")


@router.get("/{vmid}/metrics")
async def get_container_metrics(
    vmid: int,
    node: str = "r7625",
    user: dict = Depends(get_current_user),
):
    """Live CPU, RAM, disk I/O, and network metrics for a specific LXC container."""
    try:
        data = await proxmox_client.get_container_rrddata(vmid, node, timeframe="hour")
        for entry in reversed(data):
            if entry.get("cpu") is not None:
                mem_used = entry.get("mem", 0) or 0
                mem_max = entry.get("maxmem", 0) or 0
                return {
                    "vmid": vmid,
                    "node": node,
                    "cpu_percent": round((entry.get("cpu", 0) or 0) * 100, 1),
                    "mem_used_mb": round(mem_used / (1024 ** 2), 1),
                    "mem_total_mb": round(mem_max / (1024 ** 2), 1),
                    "mem_percent": round(mem_used / mem_max * 100, 1) if mem_max else 0,
                    "disk_read_mbps": round((entry.get("diskread", 0) or 0) * 8 / 1_000_000, 3),
                    "disk_write_mbps": round((entry.get("diskwrite", 0) or 0) * 8 / 1_000_000, 3),
                    "net_in_mbps": round((entry.get("netin", 0) or 0) * 8 / 1_000_000, 3),
                    "net_out_mbps": round((entry.get("netout", 0) or 0) * 8 / 1_000_000, 3),
                    "source": "proxmox_rrd",
                }
        return {"vmid": vmid, "node": node, "source": "proxmox_rrd", "note": "No data yet"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch container metrics: {e}")


@router.get("/{vmid}/snapshots")
async def list_container_snapshots(
    vmid: int,
    node: str = "r7625",
    user: dict = Depends(get_current_user),
):
    """List snapshots for an LXC container."""
    try:
        snapshots = await proxmox_client.list_container_snapshots(vmid, node)
        return {
            "vmid": vmid,
            "snapshots": [
                {
                    "name": s.get("name"),
                    "description": s.get("description", ""),
                    "parent": s.get("parent"),
                    "snaptime": s.get("snaptime"),
                }
                for s in snapshots
                if s.get("name") != "current"
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to list container snapshots: {e}")


@router.post("/", status_code=202)
async def create_container(
    data: LXCCreate,
    node: str = "r7625",
    user: dict = Depends(require_role("operator")),
):
    """Create a new LXC container. Returns a UPID to poll via /api/tasks/{upid}."""
    # Auto-assign next VMID if not provided
    if data.vmid is None:
        existing_vms = await proxmox_client.list_vms(node)
        existing_lxc = await proxmox_client.list_containers(node)
        all_ids = [v["vmid"] for v in existing_vms] + [c["vmid"] for c in existing_lxc]
        data.vmid = max(all_ids, default=99) + 1

    bridge = f"vmbr{data.vlan}"
    if data.ip_address and data.gateway:
        net_config = f"name=eth0,bridge={bridge},ip={data.ip_address},gw={data.gateway},firewall=1"
    elif data.ip_address:
        net_config = f"name=eth0,bridge={bridge},ip={data.ip_address},firewall=1"
    else:
        net_config = f"name=eth0,bridge={bridge},ip=dhcp,firewall=1"

    params: dict = {
        "vmid": data.vmid,
        "hostname": data.hostname,
        "ostemplate": data.ostemplate,
        "storage": data.storage,
        "rootfs": f"{data.storage}:{data.rootfs_gb}",
        "memory": data.memory_mb,
        "swap": data.swap_mb,
        "cores": data.cpu_cores,
        "net0": net_config,
        "unprivileged": 1 if data.unprivileged else 0,
        "start": 0,
        "tags": ";".join(data.tags) if data.tags else "",
        "features": "nesting=1",  # allow Docker inside LXC
    }
    if data.password:
        params["password"] = data.password
    if data.ssh_public_key:
        params["ssh-public-keys"] = data.ssh_public_key

    try:
        upid = await proxmox_client.create_container(node, **params)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "status": "provisioning",
        "vmid": data.vmid,
        "hostname": data.hostname,
        "task_upid": upid,
        "poll_url": f"/api/tasks/{upid}",
    }


@router.post("/{vmid}/action")
async def container_action(
    vmid: int,
    action: LXCAction,
    node: str = "r7625",
    user: dict = Depends(require_role("operator")),
):
    """Execute an action on an LXC container: start | stop | restart | delete."""
    destructive = {"delete", "stop"}
    if action.action in destructive and not action.parameters.get("approval_confirmed"):
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail=f"Action '{action.action}' requires parameters.approval_confirmed=true",
        )

    action_map = {
        "start": proxmox_client.start_container,
        "stop": proxmox_client.stop_container,
        "restart": proxmox_client.restart_container,
        "delete": proxmox_client.delete_container,
    }

    if action.action not in action_map:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action.action}")

    try:
        upid = await action_map[action.action](vmid, node)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Action failed: {e}")

    return {
        "status": "ok",
        "action": action.action,
        "vmid": vmid,
        "task_upid": upid,
        "poll_url": f"/api/tasks/{upid}",
    }
