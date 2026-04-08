"""System metrics endpoints — real-time data from Proxmox node + Netdata."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import get_settings
from app.core.security import get_current_user
from app.services.proxmox import proxmox_client

settings = get_settings()
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


@router.get("/vm-summary")
async def get_vm_summary(
    node: str = "r7625",
    user: dict = Depends(get_current_user),
):
    """Aggregate live metrics across all running VMs on the node."""
    try:
        vms = await proxmox_client.list_vms(node)
        running = [v for v in vms if v.get("status") == "running"]
        total_cpu_pct = round(
            sum((v.get("cpu", 0) or 0) * 100 for v in running) / max(len(running), 1), 1
        )
        total_mem_used = sum(v.get("mem", 0) or 0 for v in running)
        total_mem_max = sum(v.get("maxmem", 0) or 0 for v in running)
        containers = await proxmox_client.list_containers(node)
        running_lxc = [c for c in containers if c.get("status") == "running"]
        return {
            "node": node,
            "vms": {
                "total": len(vms),
                "running": len(running),
                "stopped": len(vms) - len(running),
                "avg_cpu_percent": total_cpu_pct,
                "total_mem_used_gb": round(total_mem_used / (1024 ** 3), 1),
                "total_mem_allocated_gb": round(total_mem_max / (1024 ** 3), 1),
            },
            "containers": {
                "total": len(containers),
                "running": len(running_lxc),
                "stopped": len(containers) - len(running_lxc),
            },
            "source": "proxmox_live",
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to aggregate VM metrics: {e}")


# ---------------------------------------------------------------------------
# Netdata Integration
# ---------------------------------------------------------------------------

@router.get("/netdata/summary")
async def get_netdata_summary(user: dict = Depends(get_current_user)):
    """Fetch host-level summary from Netdata agent (CPU, RAM, load, network).

    Requires NETDATA_ENABLED=true and Netdata installed on the Proxmox host.
    Install: curl https://get.netdata.cloud/kickstart.sh | sudo bash
    """
    if not settings.NETDATA_ENABLED:
        return {
            "enabled": False,
            "message": "Set NETDATA_ENABLED=true and NETDATA_URL in .env to activate.",
        }

    base = settings.NETDATA_URL.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Fetch multiple charts in parallel
            cpu_resp, ram_resp, load_resp, net_resp = await _fetch_netdata_charts(
                client, base,
                charts=["system.cpu", "system.ram", "system.load", "system.net"],
            )
        return {
            "enabled": True,
            "source": base,
            "cpu": _parse_netdata_chart(cpu_resp),
            "ram": _parse_netdata_chart(ram_resp),
            "load": _parse_netdata_chart(load_resp),
            "network": _parse_netdata_chart(net_resp),
        }
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot reach Netdata at {base}. Is it installed and running?",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Netdata error: {e}")


@router.get("/netdata/anomalies")
async def get_netdata_anomalies(user: dict = Depends(get_current_user)):
    """Fetch ML anomaly detection results from Netdata.

    Netdata runs k-means clustering per metric (18 models, 54-hour window).
    Returns charts currently flagged as anomalous (score > 50%).
    """
    if not settings.NETDATA_ENABLED:
        return {
            "enabled": False,
            "message": "Set NETDATA_ENABLED=true and NETDATA_URL in .env to activate.",
        }

    base = settings.NETDATA_URL.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base}/api/v1/anomaly_detection/anomalous_charts")
            if resp.status_code == 404:
                return {
                    "enabled": True,
                    "anomalies": [],
                    "note": "Netdata ML requires v1.32+ with anomaly detection enabled.",
                }
            resp.raise_for_status()
            data = resp.json()
        return {
            "enabled": True,
            "source": base,
            "anomalies": data.get("anomalous_charts", []),
            "total": len(data.get("anomalous_charts", [])),
        }
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot reach Netdata at {base}.",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Netdata anomaly fetch error: {e}")


async def _fetch_netdata_charts(client: httpx.AsyncClient, base: str, charts: list[str]):
    """Fetch multiple Netdata chart data endpoints concurrently."""
    import asyncio
    tasks = [
        client.get(f"{base}/api/v1/data", params={"chart": chart, "points": 1, "format": "json"})
        for chart in charts
    ]
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    results = []
    for resp in responses:
        if isinstance(resp, Exception):
            results.append(None)
        else:
            try:
                results.append(resp.json() if resp.status_code == 200 else None)
            except Exception:
                results.append(None)
    return results


def _parse_netdata_chart(data: dict | None) -> dict:
    """Extract the latest value(s) from a Netdata chart API response."""
    if not data:
        return {"available": False}
    try:
        labels = data.get("labels", [])
        latest = data.get("data", [[]])[0] if data.get("data") else []
        return {
            "available": True,
            "labels": labels,
            "values": latest,
        }
    except Exception:
        return {"available": False}
