"""Service template endpoints — one-click deployments for VPN, DaaS, dev environments."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import ServiceDeployment
from app.services.service_templates import list_templates, get_template, deploy_service

router = APIRouter(prefix="/services", tags=["Service Templates"])


class DeployRequest(BaseModel):
    template_id: str
    name: str | None = None
    cores: int | None = Field(None, ge=1, le=64)
    ram_mb: int | None = Field(None, ge=512, le=131072)
    disk_gb: int | None = Field(None, ge=10, le=4000)
    vlan: int | None = Field(None, ge=10, le=50)


@router.get("/templates")
async def get_templates(user: dict = Depends(get_current_user)):
    """List all available service templates."""
    return await list_templates()


@router.get("/templates/{template_id}")
async def get_template_detail(
    template_id: str,
    user: dict = Depends(get_current_user),
):
    """Get detailed information about a service template."""
    template = await get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return template


@router.post("/deploy")
async def deploy_service_endpoint(
    req: DeployRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("operator")),
):
    """Deploy a service from a template. Creates a VM and configures it."""
    overrides = {}
    if req.name:
        overrides["name"] = req.name
    if req.cores:
        overrides["cores"] = req.cores
    if req.ram_mb:
        overrides["ram_mb"] = req.ram_mb
    if req.disk_gb:
        overrides["disk_gb"] = req.disk_gb
    if req.vlan:
        overrides["vlan"] = req.vlan

    try:
        result = await deploy_service(
            template_id=req.template_id,
            overrides=overrides,
            db=db,
            user_id=user.get("sub"),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")


@router.get("/deployments")
async def list_deployments(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all service deployments."""
    result = await db.execute(
        select(ServiceDeployment).order_by(ServiceDeployment.created_at.desc())
    )
    deployments = list(result.scalars().all())
    return [
        {
            "deployment_id": d.deployment_id,
            "template_id": d.template_id,
            "template_name": d.template_name,
            "vm_id": str(d.vm_id) if d.vm_id else None,
            "vmid": d.vmid,
            "vm_name": d.vm_name,
            "status": d.status,
            "message": d.message,
            "deployed_by": d.deployed_by,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in deployments
    ]
