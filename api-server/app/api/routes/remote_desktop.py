"""Remote Desktop — Guacamole connection registry (replaces hardcoded frontend map)."""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import GuacamoleConnection, VirtualMachine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/remote-desktop", tags=["Remote Desktop"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class GuacConnectionCreate(BaseModel):
    vmid: int | None = None
    name: str
    protocol: str = "rdp"   # rdp | vnc | ssh
    host: str
    port: int | None = None
    username: str | None = None
    guac_token: str | None = None
    notes: str | None = None


class GuacConnectionUpdate(BaseModel):
    name: str | None = None
    protocol: str | None = None
    host: str | None = None
    port: int | None = None
    username: str | None = None
    guac_token: str | None = None
    notes: str | None = None


def _default_port(protocol: str) -> int:
    return {"rdp": 3389, "vnc": 5900, "ssh": 22}.get(protocol, 3389)


def _serialize(conn: GuacamoleConnection, vm: VirtualMachine | None = None) -> dict:
    return {
        "id": str(conn.id),
        "vmid": conn.vmid,
        "vm_name": vm.name if vm else None,
        "vm_status": vm.status if vm else None,
        "name": conn.name,
        "protocol": conn.protocol,
        "host": conn.host,
        "port": conn.port,
        "username": conn.username,
        "guac_token": conn.guac_token,
        "notes": conn.notes,
        "created_at": conn.created_at.isoformat() if conn.created_at else None,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/connections")
async def list_connections(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """List all registered Guacamole connections with VM status."""
    result = await db.execute(select(GuacamoleConnection).order_by(GuacamoleConnection.name))
    connections = result.scalars().all()

    out = []
    for conn in connections:
        vm = None
        if conn.vmid:
            vm_result = await db.execute(
                select(VirtualMachine).where(VirtualMachine.vmid == conn.vmid)
            )
            vm = vm_result.scalar_one_or_none()
        out.append(_serialize(conn, vm))
    return out


@router.post("/connections")
async def create_connection(
    body: GuacConnectionCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Register a new Guacamole connection."""
    vm_id = None
    if body.vmid:
        vm_result = await db.execute(
            select(VirtualMachine).where(VirtualMachine.vmid == body.vmid)
        )
        vm = vm_result.scalar_one_or_none()
        vm_id = vm.id if vm else None

    conn = GuacamoleConnection(
        vm_id=vm_id,
        vmid=body.vmid,
        name=body.name,
        protocol=body.protocol,
        host=body.host,
        port=body.port or _default_port(body.protocol),
        username=body.username,
        guac_token=body.guac_token,
        notes=body.notes,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    vm_result = await db.execute(
        select(VirtualMachine).where(VirtualMachine.vmid == body.vmid)
    ) if body.vmid else None
    vm = vm_result.scalar_one_or_none() if vm_result else None

    logger.info("Guacamole connection created: %s (%s) → %s:%s", conn.name, conn.protocol, conn.host, conn.port)
    return _serialize(conn, vm)


@router.patch("/connections/{connection_id}")
async def update_connection(
    connection_id: str,
    body: GuacConnectionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Update a Guacamole connection record."""
    result = await db.execute(
        select(GuacamoleConnection).where(GuacamoleConnection.id == uuid.UUID(connection_id))
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(conn, field, val)

    await db.commit()
    await db.refresh(conn)

    vm = None
    if conn.vmid:
        vm_result = await db.execute(
            select(VirtualMachine).where(VirtualMachine.vmid == conn.vmid)
        )
        vm = vm_result.scalar_one_or_none()

    return _serialize(conn, vm)


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Remove a Guacamole connection from the registry."""
    result = await db.execute(
        select(GuacamoleConnection).where(GuacamoleConnection.id == uuid.UUID(connection_id))
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
    return {"connection_id": connection_id, "deleted": True}
