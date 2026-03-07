"""Network topology and VLAN management endpoints."""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.proxmox import proxmox_client

router = APIRouter(prefix="/network", tags=["Network"])


@router.get("/topology")
async def get_topology(user: dict = Depends(get_current_user)):
    """Fetch live network topology from Proxmox — VLANs, bridges, interfaces."""
    try:
        network_data = await proxmox_client.get_network()
        vlans = []
        bridges = []
        for iface in network_data:
            iface_type = iface.get("type", "")
            entry = {
                "name": iface.get("iface", ""),
                "type": iface_type,
                "address": iface.get("address"),
                "netmask": iface.get("netmask"),
                "cidr": iface.get("cidr"),
                "gateway": iface.get("gateway"),
                "active": iface.get("active", False),
                "autostart": iface.get("autostart", False),
                "bridge_ports": iface.get("bridge_ports"),
                "comments": iface.get("comments"),
            }
            if "vlan" in iface_type or iface.get("iface", "").find(".") > 0:
                vlans.append(entry)
            elif "bridge" in iface_type:
                bridges.append(entry)

        return {
            "vlans": vlans,
            "bridges": bridges,
            "interfaces": network_data,
            "source": "proxmox_live",
        }
    except Exception as e:
        return {
            "vlans": [],
            "bridges": [],
            "interfaces": [],
            "source": "error",
            "error": str(e),
        }


@router.get("/storage")
async def get_storage(user: dict = Depends(get_current_user)):
    """Fetch storage pool info from Proxmox — ZFS, local, NFS."""
    try:
        storage_data = await proxmox_client.get_storage()
        pools = []
        for pool in storage_data:
            pools.append({
                "storage": pool.get("storage", ""),
                "type": pool.get("type", ""),
                "content": pool.get("content", ""),
                "total_bytes": pool.get("total", 0),
                "used_bytes": pool.get("used", 0),
                "available_bytes": pool.get("avail", 0),
                "active": pool.get("active", False),
                "enabled": pool.get("enabled", 1),
                "shared": pool.get("shared", 0),
            })
        return {"pools": pools, "source": "proxmox_live"}
    except Exception as e:
        return {"pools": [], "source": "error", "error": str(e)}
