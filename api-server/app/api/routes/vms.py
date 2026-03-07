"""Virtual Machine management endpoints — Proxmox VE 9.1 integration."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import VirtualMachine
from app.api.schemas.schemas import VMCreate, VMResponse, VMAction
from app.services.proxmox import proxmox_client
from app.services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vms", tags=["Virtual Machines"])


class VMCloneRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class VMResizeRequest(BaseModel):
    disk: str = "scsi0"
    size: str = Field(description="e.g. +10G or 100G")


@router.get("/", response_model=list[VMResponse])
async def list_vms(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all virtual machines from database + live Proxmox status."""
    result = await db.execute(select(VirtualMachine).order_by(VirtualMachine.name))
    vms = list(result.scalars().all())

    try:
        live_vms = await proxmox_client.list_vms()
        live_map = {v["vmid"]: v for v in live_vms}
        for vm in vms:
            if vm.vmid in live_map:
                vm.status = live_map[vm.vmid].get("status", vm.status)
    except Exception as e:
        logger.warning(f"Proxmox sync failed: {e}")

    return vms


@router.get("/{vm_id}", response_model=VMResponse)
async def get_vm(
    vm_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(VirtualMachine).where(VirtualMachine.id == vm_id)
    )
    vm = result.scalar_one_or_none()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")

    try:
        live = await proxmox_client.get_vm_status(vm.vmid)
        vm.status = live.get("status", vm.status)
    except Exception as e:
        logger.warning(f"Proxmox status sync failed for VMID {vm.vmid}: {e}")

    return vm


@router.post("/", response_model=VMResponse, status_code=201)
async def create_vm(
    vm_data: VMCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("operator")),
):
    """Create a new VM via Proxmox API. Requires operator role."""
    existing = await proxmox_client.list_vms()
    next_vmid = max((v["vmid"] for v in existing), default=99) + 1

    await proxmox_client.create_vm(
        vmid=next_vmid,
        name=vm_data.name,
        cores=vm_data.cpu_cores,
        memory=vm_data.ram_mb,
        ostype=vm_data.os_type,
        tags=";".join(vm_data.tags) if vm_data.tags else "",
    )

    vm = VirtualMachine(
        vmid=next_vmid,
        name=vm_data.name,
        os_type=vm_data.os_type,
        cpu_cores=vm_data.cpu_cores,
        ram_mb=vm_data.ram_mb,
        disk_gb=vm_data.disk_gb,
        vlan=vm_data.vlan,
        template=vm_data.template,
        tags=vm_data.tags,
        status="stopped",
    )
    db.add(vm)
    await db.flush()

    await log_action(
        db,
        action="vm.create",
        resource_type="vm",
        resource_id=str(vm.id),
        user_id=UUID(user["sub"]) if "sub" in user else None,
        parameters=vm_data.model_dump(),
        outcome="success",
        rollback_plan=f"Delete VM {next_vmid} via Proxmox API",
    )

    return vm


@router.post("/{vm_id}/action")
async def vm_action(
    vm_id: UUID,
    action: VMAction,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("operator")),
):
    """Execute an action on a VM (start, stop, restart, snapshot, delete, clone, resize)."""
    result = await db.execute(
        select(VirtualMachine).where(VirtualMachine.id == vm_id)
    )
    vm = result.scalar_one_or_none()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")

    destructive_actions = {"delete", "stop"}
    if action.action in destructive_actions:
        approval = action.parameters.get("approval_confirmed", False)
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail=f"Action '{action.action}' requires explicit approval. "
                f"Set parameters.approval_confirmed=true to confirm.",
            )

    action_map = {
        "start": proxmox_client.start_vm,
        "stop": proxmox_client.stop_vm,
        "restart": proxmox_client.restart_vm,
        "delete": proxmox_client.delete_vm,
    }

    if action.action == "snapshot":
        snap_name = action.parameters.get("name", f"snap-{vm.vmid}")
        result_data = await proxmox_client.create_snapshot(
            vm.vmid, snap_name, action.parameters.get("description", "")
        )
    elif action.action == "clone":
        clone_name = action.parameters.get("name", f"{vm.name}-clone")
        existing = await proxmox_client.list_vms()
        new_vmid = max((v["vmid"] for v in existing), default=99) + 1
        result_data = await proxmox_client.clone_vm(vm.vmid, new_vmid, clone_name)
    elif action.action == "resize":
        disk = action.parameters.get("disk", "scsi0")
        size = action.parameters.get("size", "+10G")
        result_data = await proxmox_client.resize_disk(vm.vmid, disk, size)
    elif action.action in action_map:
        result_data = await action_map[action.action](vm.vmid)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action.action}")

    await log_action(
        db,
        action=f"vm.{action.action}",
        resource_type="vm",
        resource_id=str(vm.id),
        user_id=UUID(user["sub"]) if "sub" in user else None,
        parameters={"vmid": vm.vmid, **action.parameters},
        outcome="success",
        rollback_plan=f"Reverse action on VM {vm.vmid}",
    )

    return {"status": "ok", "action": action.action, "vmid": vm.vmid, "result": result_data}
