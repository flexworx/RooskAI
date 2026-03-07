"""Proxmox VE API client — VM lifecycle management."""

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

    async def create_vm(self, node: str = "r7625", **params: Any) -> dict:
        """Create a new VM. Requires approval for destructive context."""
        async with self._client() as client:
            resp = await client.post(f"/nodes/{node}/qemu", data=params)
            resp.raise_for_status()
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

    async def get_network(self, node: str = "r7625") -> list[dict]:
        async with self._client() as client:
            resp = await client.get(f"/nodes/{node}/network")
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


proxmox_client = ProxmoxClient()
