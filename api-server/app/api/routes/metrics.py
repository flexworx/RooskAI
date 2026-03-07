"""System metrics endpoints — real-time data from Proxmox node."""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.proxmox import proxmox_client

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/system")
async def get_system_metrics(user: dict = Depends(get_current_user)):
    """Fetch live CPU, RAM, storage, and network metrics from Proxmox node."""
    try:
        node_status = await proxmox_client.get_node_status()
        cpu_percent = round(node_status.get("cpu", 0) * 100, 1)
        mem = node_status.get("memory", {})
        ram_total_bytes = mem.get("total", 0)
        ram_used_bytes = mem.get("used", 0)
        rootfs = node_status.get("rootfs", {})
        storage_total_bytes = rootfs.get("total", 0)
        storage_used_bytes = rootfs.get("used", 0)

        # Network bytes from Proxmox — cumulative totals since boot
        netin_bytes = node_status.get("netin", 0)
        netout_bytes = node_status.get("netout", 0)

        return {
            "cpu_percent": cpu_percent,
            "ram_used_gb": round(ram_used_bytes / (1024**3), 1),
            "ram_total_gb": round(ram_total_bytes / (1024**3), 1),
            "storage_used_gb": round(storage_used_bytes / (1024**3), 1),
            "storage_total_gb": round(storage_total_bytes / (1024**3), 1),
            "network_rx_bytes": netin_bytes,
            "network_tx_bytes": netout_bytes,
            "network_rx_mb": round(netin_bytes / (1024**2), 1),
            "network_tx_mb": round(netout_bytes / (1024**2), 1),
            "uptime_seconds": node_status.get("uptime", 0),
            "loadavg": node_status.get("loadavg", [0, 0, 0]),
            "cpu_count": node_status.get("cpuinfo", {}).get("cpus", 0),
            "cpu_model": node_status.get("cpuinfo", {}).get("model", ""),
            "source": "proxmox_live",
        }
    except Exception as e:
        return {
            "cpu_percent": 0,
            "ram_used_gb": 0,
            "ram_total_gb": 0,
            "storage_used_gb": 0,
            "storage_total_gb": 0,
            "network_rx_bytes": 0,
            "network_tx_bytes": 0,
            "network_rx_mb": 0,
            "network_tx_mb": 0,
            "source": "error",
            "error": str(e),
        }


@router.get("/nodes")
async def get_nodes(user: dict = Depends(get_current_user)):
    """List all Proxmox cluster nodes with status."""
    try:
        nodes = await proxmox_client.get_nodes()
        return {"nodes": nodes, "source": "proxmox_live"}
    except Exception as e:
        return {"nodes": [], "source": "error", "error": str(e)}
