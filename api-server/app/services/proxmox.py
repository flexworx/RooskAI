"""Proxmox VE API client — VM lifecycle management."""

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ProxmoxClient:
    """Manages communication with Proxmox VE 9.1 API on Dell R7625."""

    def __init__(self):
        self._base_url = settings.PROXMOX_URL.rstrip("/") + "/api2/json"
        self._headers = {
            "Authorization": f"PVEAPIToken={settings.PROXMOX_TOKEN_ID}={settings.PROXMOX_TOKEN_SECRET}",
        }

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._base_url,
            headers=self._headers,
            verify=settings.PROXMOX_VERIFY_SSL,
            timeout=30.0,
        )

    async def get_nodes(self) -> list[dict]:
        async with self._client() as client:
            resp = await client.get("/nodes")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_node_status(self, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/status")
            resp.raise_for_status()
            return resp.json()["data"]

    async def list_vms(self, node: str = "r7625") -> list[dict]:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/qemu")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_vm_status(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/qemu/{vmid}/status/current")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_vm_config(self, vmid: int, node: str = "r7625") -> dict:
        """Get VM configuration (network, cloud-init, disks)."""
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/qemu/{vmid}/config")
            resp.raise_for_status()
            return resp.json()["data"]

    async def create_vm(self, node: str = "r7625", **params: Any) -> dict:
        """Create a new VM. Raises with Proxmox error detail on failure."""
        logger.info(f"Creating VM with params: {params}")
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu", data=params)
            if resp.status_code >= 400:
                body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                errors = body.get("errors", {})
                detail = body.get("data", body)
                error_msg = f"Proxmox VM create failed ({resp.status_code})"
                if errors:
                    error_msg += f": {errors}"
                elif detail:
                    error_msg += f": {detail}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
            return resp.json()["data"]

    async def start_vm(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu/{vmid}/status/start")
            resp.raise_for_status()
            return resp.json()["data"]

    async def stop_vm(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu/{vmid}/status/stop")
            resp.raise_for_status()
            return resp.json()["data"]

    async def restart_vm(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu/{vmid}/status/reboot")
            resp.raise_for_status()
            return resp.json()["data"]

    async def delete_vm(self, vmid: int, node: str = "r7625") -> dict:
        """Delete a VM. DESTRUCTIVE — requires human approval."""
        async with self._client() as client:
            resp = await client.delete(f"/nodes/{node}/qemu/{vmid}")
            resp.raise_for_status()
            return resp.json()["data"]

    async def create_snapshot(
        self, vmid: int, name: str, description: str = "", node: str = "r7625"
    ) -> dict:
        async with self._client() as client:
            resp = await client.post(
                f"/nodes/{node}/qemu/{vmid}/snapshot",
                data={"snapname": name, "description": description},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def clone_vm(
        self, vmid: int, newid: int, name: str, node: str = "r7625"
    ) -> dict:
        async with self._client() as client:
            resp = await client.post(
                f"/nodes/{node}/qemu/{vmid}/clone",
                data={"newid": newid, "name": name, "full": 1},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def resize_disk(
        self, vmid: int, disk: str, size: str, node: str = "r7625"
    ) -> dict:
        async with self._client() as client:
            resp = await client.put(
                f"/nodes/{node}/qemu/{vmid}/resize",
                data={"disk": disk, "size": size},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_storage(self, node: str = "r7625") -> list[dict]:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/storage")
            resp.raise_for_status()
            return resp.json()["data"]

    async def list_isos(self, storage: str = "local", node: str = "r7625") -> list[str]:
        """List ISO filenames available on a storage."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/storage/{storage}/content",
                params={"content": "iso"},
            )
            resp.raise_for_status()
            return [
                item["volid"].split("/", 1)[-1]
                for item in resp.json()["data"]
                if item.get("content") == "iso"
            ]

    async def get_network(self, node: str = "r7625") -> list[dict]:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/network")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_node_rrddata(self, node: str = "r7625", timeframe: str = "hour") -> list[dict]:
        """Fetch RRD time-series data (includes netin/netout rates in bytes/sec)."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/rrddata",
                params={"timeframe": timeframe, "cf": "AVERAGE"},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    # --- LXC Container Management ---

    async def list_containers(self, node: str = "r7625") -> list[dict]:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/lxc")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_container_status(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/lxc/{vmid}/status/current")
            resp.raise_for_status()
            return resp.json()["data"]

    async def start_container(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/lxc/{vmid}/status/start")
            resp.raise_for_status()
            return resp.json()["data"]

    async def stop_container(self, vmid: int, node: str = "r7625") -> dict:
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/lxc/{vmid}/status/stop")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_vm_vnc(self, vmid: int, node: str = "r7625") -> dict:
        """Get VNC console proxy ticket for a VM."""
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu/{vmid}/vncproxy")
            resp.raise_for_status()
            return resp.json()["data"]

    async def resize_vm(
        self, vmid: int, cores: int | None = None, memory: int | None = None, node: str = "r7625"
    ) -> dict:
        """Resize VM CPU/RAM (hot-pluggable if supported)."""
        data: dict[str, Any] = {}
        if cores is not None:
            data["cores"] = cores
        if memory is not None:
            data["memory"] = memory
        async with self._client() as client:
            resp = await client.put(f"/nodes/{node}/qemu/{vmid}/config", data=data)
            resp.raise_for_status()
            return resp.json().get("data", {})

    async def health_check(self) -> dict:
        """Quick connectivity check to Proxmox API."""
        try:
            async with self._client() as client:
                resp = await client.get("/version")
                resp.raise_for_status()
                data = resp.json()["data"]
                return {"status": "healthy", "version": data.get("version", "unknown")}
        except Exception as e:
            logger.warning(f"Proxmox health check failed: {e}")
            return {"status": "unhealthy", "error": str(e)}

    # --- Task / UPID Management ---

    async def get_task_status(self, upid: str, node: str = "r7625") -> dict:
        """Get the current status of a Proxmox task by UPID."""
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/tasks/{upid}/status")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_task_log(self, upid: str, node: str = "r7625", limit: int = 50) -> list[dict]:
        """Get log output for a Proxmox task."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/tasks/{upid}/log",
                params={"limit": limit},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def poll_task(
        self, upid: str, node: str = "r7625", timeout: int = 120, interval: float = 2.0
    ) -> dict:
        """Poll a Proxmox UPID until it finishes or times out.

        Returns the final task status dict with keys: status, exitstatus, type, upid.
        Raises RuntimeError if the task fails or times out.
        """
        elapsed = 0.0
        while elapsed < timeout:
            status = await self.get_task_status(upid, node)
            if status.get("status") == "stopped":
                exit_status = status.get("exitstatus", "")
                if exit_status == "OK":
                    return status
                raise RuntimeError(
                    f"Proxmox task {upid} failed: {exit_status}"
                )
            await asyncio.sleep(interval)
            elapsed += interval
        raise TimeoutError(f"Proxmox task {upid} did not complete within {timeout}s")

    async def list_tasks(self, node: str = "r7625", limit: int = 50) -> list[dict]:
        """List recent tasks on a node."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/tasks",
                params={"limit": limit},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    # --- Per-VM Metrics ---

    async def get_vm_rrddata(
        self, vmid: int, node: str = "r7625", timeframe: str = "hour"
    ) -> list[dict]:
        """Fetch RRD time-series data for a specific VM (CPU, mem, disk, net)."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/qemu/{vmid}/rrddata",
                params={"timeframe": timeframe, "cf": "AVERAGE"},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_vm_current_metrics(self, vmid: int, node: str = "r7625") -> dict:
        """Get the latest single data point of VM metrics from RRD."""
        data = await self.get_vm_rrddata(vmid, node, timeframe="hour")
        # Walk in reverse to find the most recent non-null entry
        for entry in reversed(data):
            if entry.get("cpu") is not None:
                mem_used = entry.get("mem", 0) or 0
                mem_max = entry.get("maxmem", 0) or 0
                disk_read = entry.get("diskread", 0) or 0
                disk_write = entry.get("diskwrite", 0) or 0
                net_in = entry.get("netin", 0) or 0
                net_out = entry.get("netout", 0) or 0
                return {
                    "cpu_percent": round((entry.get("cpu", 0) or 0) * 100, 1),
                    "mem_used_mb": round(mem_used / (1024 ** 2), 1),
                    "mem_total_mb": round(mem_max / (1024 ** 2), 1),
                    "mem_percent": round(mem_used / mem_max * 100, 1) if mem_max else 0,
                    "disk_read_mbps": round(disk_read * 8 / 1_000_000, 3),
                    "disk_write_mbps": round(disk_write * 8 / 1_000_000, 3),
                    "net_in_mbps": round(net_in * 8 / 1_000_000, 3),
                    "net_out_mbps": round(net_out * 8 / 1_000_000, 3),
                }
        return {}

    # --- Snapshot Management ---

    async def list_snapshots(self, vmid: int, node: str = "r7625") -> list[dict]:
        """List all snapshots for a VM."""
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/qemu/{vmid}/snapshot")
            resp.raise_for_status()
            return resp.json()["data"]

    async def delete_snapshot(self, vmid: int, snapname: str, node: str = "r7625") -> str:
        """Delete a VM snapshot. Returns UPID."""
        async with self._client() as client:
            resp = await client.delete(f"/nodes/{node}/qemu/{vmid}/snapshot/{snapname}")
            resp.raise_for_status()
            return resp.json()["data"]

    async def rollback_snapshot(self, vmid: int, snapname: str, node: str = "r7625") -> str:
        """Rollback VM to a snapshot. Returns UPID."""
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu/{vmid}/snapshot/{snapname}/rollback")
            resp.raise_for_status()
            return resp.json()["data"]

    # --- LXC Metrics ---

    async def get_container_rrddata(
        self, vmid: int, node: str = "r7625", timeframe: str = "hour"
    ) -> list[dict]:
        """Fetch RRD time-series data for an LXC container."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/lxc/{vmid}/rrddata",
                params={"timeframe": timeframe, "cf": "AVERAGE"},
            )
            resp.raise_for_status()
            return resp.json()["data"]

    async def create_container(self, node: str = "r7625", **params: Any) -> str:
        """Create a new LXC container. Returns UPID."""
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/lxc", data=params)
            if resp.status_code >= 400:
                body = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                raise RuntimeError(f"LXC create failed ({resp.status_code}): {body.get('errors', body)}")
            return resp.json()["data"]

    async def restart_container(self, vmid: int, node: str = "r7625") -> str:
        """Restart an LXC container. Returns UPID."""
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/lxc/{vmid}/status/restart")
            resp.raise_for_status()
            return resp.json()["data"]

    async def delete_container(self, vmid: int, node: str = "r7625") -> str:
        """Delete an LXC container. DESTRUCTIVE. Returns UPID."""
        async with self._client() as client:
            resp = await client.delete(f"/nodes/{node}/lxc/{vmid}")
            resp.raise_for_status()
            return resp.json()["data"]

    async def get_container_config(self, vmid: int, node: str = "r7625") -> dict:
        """Get LXC container configuration."""
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/lxc/{vmid}/config")
            resp.raise_for_status()
            return resp.json()["data"]

    async def list_container_snapshots(self, vmid: int, node: str = "r7625") -> list[dict]:
        """List snapshots for an LXC container."""
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/lxc/{vmid}/snapshot")
            resp.raise_for_status()
            return resp.json()["data"]

    async def list_storage_content(
        self, storage: str = "local", content_type: str = "vztmpl", node: str = "r7625"
    ) -> list[dict]:
        """List storage content (e.g. LXC templates, ISOs)."""
        async with self._client() as client:
            resp = await client.get(
                f"/nodes/{node}/storage/{storage}/content",
                params={"content": content_type},
            )
            resp.raise_for_status()
            return resp.json()["data"]


proxmox_client = ProxmoxClient()
