"""System metrics endpoints — real-time data from Proxmox node."""

import logging

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.proxmox import proxmox_client

logger = logging.getLogger(__name__)

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

        # Network — get rates from RRD time-series data (bytes/sec averages)
        rx_mbps = 0.0
        tx_mbps = 0.0
        try:
            rrd_data = await proxmox_client.get_node_rrddata()
            if rrd_data:
                # Use the most recent data point that has valid values
                for entry in reversed(rrd_data):
                    netin = entry.get("netin")
                    netout = entry.get("netout")
                    if netin is not None and netout is not None:
                        rx_mbps = round(netin * 8 / 1_000_000, 2)
                        tx_mbps = round(netout * 8 / 1_000_000, 2)
                        break
        except Exception as e:
            logger.warning(f"Failed to fetch network rrddata: {e}")

        return {
            "cpu_percent": cpu_percent,
            "ram_used_gb": round(ram_used_bytes / (1024**3), 1),
            "ram_total_gb": round(ram_total_bytes / (1024**3), 1),
            "storage_used_gb": round(storage_used_bytes / (1024**3), 1),
            "storage_total_gb": round(storage_total_bytes / (1024**3), 1),
            "network_rx_mbps": rx_mbps,
            "network_tx_mbps": tx_mbps,
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
            "network_rx_mbps": 0,
            "network_tx_mbps": 0,
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
