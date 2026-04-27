"""WebSocket SSH proxy — browser-based terminal access to managed hosts.

Provides a real-time bidirectional bridge between the browser (xterm.js)
and remote SSH servers via asyncssh. Authentication is JWT-based via
query parameter. Only hosts within allowed network ranges are permitted.
"""

import asyncio
import ipaddress
import json
import logging
import os
import subprocess
from pathlib import Path

import asyncssh
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Security

from app.core.security import decode_token, get_current_user
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/ssh", tags=["SSH Terminal"])

# ---------------------------------------------------------------------------
# Allowed network ranges — only internal infrastructure
# ---------------------------------------------------------------------------
ALLOWED_NETWORKS = [
    ipaddress.ip_network("192.168.4.0/24"),   # Management VLAN
    ipaddress.ip_network("10.20.0.0/24"),      # Control Plane VLAN
    ipaddress.ip_network("10.30.0.0/24"),      # Tenant VLAN
    ipaddress.ip_network("172.16.40.0/24"),    # DMZ VLAN
    ipaddress.ip_network("10.50.0.0/24"),      # Storage VLAN
    ipaddress.ip_network("10.10.0.0/24"),      # WireGuard VPN
]


def _is_allowed_host(host: str) -> bool:
    """Return True if the host IP falls within allowed internal ranges."""
    if host in ("localhost", "127.0.0.1", "::1"):
        return True
    try:
        addr = ipaddress.ip_address(host)
    except ValueError:
        return False
    return any(addr in net for net in ALLOWED_NETWORKS)


# ---------------------------------------------------------------------------
# Known hosts from the Ansible inventory — for quick-connect in the UI
# ---------------------------------------------------------------------------
KNOWN_HOSTS = [
    {"name": "Proxmox (r7625)", "host": "192.168.4.58", "port": 22, "username": "root", "group": "Management"},
    {"name": "VM-FW-01 (Firewall)", "host": "192.168.4.1", "port": 22, "username": "deploy", "group": "Management"},
    {"name": "VM-IAM-01 (Keycloak)", "host": "192.168.4.20", "port": 22, "username": "deploy", "group": "Management"},
    {"name": "VM-SEC-01 (Vault)", "host": "192.168.4.30", "port": 22, "username": "deploy", "group": "Management"},
    {"name": "VM-SIEM-01 (Wazuh)", "host": "192.168.4.40", "port": 22, "username": "deploy", "group": "Management"},
    {"name": "VM-MON-01 (Monitoring)", "host": "192.168.4.50", "port": 22, "username": "deploy", "group": "Management"},
    {"name": "VM-APP-01 (Platform)", "host": "10.20.0.10", "port": 22, "username": "deploy", "group": "Control Plane"},
    {"name": "VM-DB-01 (PostgreSQL Primary)", "host": "10.20.0.20", "port": 22, "username": "deploy", "group": "Control Plane"},
    {"name": "VM-DB-02 (PostgreSQL Replica)", "host": "10.20.0.21", "port": 22, "username": "deploy", "group": "Control Plane"},
    {"name": "VM-GIT-01 (Gitea)", "host": "10.20.0.30", "port": 22, "username": "deploy", "group": "Control Plane"},
    {"name": "VM-PROXY-01 (Reverse Proxy)", "host": "172.16.40.10", "port": 22, "username": "deploy", "group": "DMZ"},
    {"name": "Swedbot (AI Agent)", "host": "10.20.0.40", "port": 22, "username": "deploy", "group": "Control Plane"},
]


def _ensure_platform_ssh_key() -> tuple[bool, str]:
    """Ensure the platform SSH key exists, generating it if needed.

    Returns (created: bool, public_key: str).
    """
    key_path = Path(settings.BACKUP_SSH_KEY_PATH)
    pub_path = key_path.with_suffix(".pub")

    # Create directory if needed
    key_path.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(key_path.parent, 0o700)

    if key_path.exists() and pub_path.exists():
        return False, pub_path.read_text().strip()

    # Generate Ed25519 key pair
    subprocess.run(
        [
            "ssh-keygen",
            "-t", "ed25519",
            "-f", str(key_path),
            "-N", "",  # no passphrase
            "-C", "roosk-platform@nexgen",
        ],
        check=True,
        capture_output=True,
    )
    os.chmod(key_path, 0o600)
    os.chmod(pub_path, 0o644)

    logger.info(f"Platform SSH key generated at {key_path}")
    return True, pub_path.read_text().strip()


@router.post("/setup-key")
async def setup_platform_key(
    user: dict = Depends(get_current_user),
):
    """Generate the platform SSH key pair if it does not exist.

    Returns the public key for deployment to target VMs via authorized_keys.
    Safe to call multiple times — idempotent.
    """
    try:
        created, public_key = _ensure_platform_ssh_key()
        return {
            "created": created,
            "key_path": settings.BACKUP_SSH_KEY_PATH,
            "public_key": public_key,
            "message": "Key generated successfully" if created else "Key already exists",
        }
    except subprocess.CalledProcessError as e:
        logger.error(f"SSH key generation failed: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Key generation failed: {e.stderr.decode()}")
    except Exception as e:
        logger.error(f"SSH key setup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public-key")
async def get_platform_public_key(
    user: dict = Depends(get_current_user),
):
    """Return the platform's SSH public key for deployment to VMs.

    Deploy this key to /home/deploy/.ssh/authorized_keys on each VM
    to enable passwordless SSH access from the platform.
    """
    pub_path = Path(settings.BACKUP_SSH_KEY_PATH).with_suffix(".pub")
    if not pub_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Platform SSH key not found. Call POST /api/ssh/setup-key first.",
        )
    return {
        "public_key": pub_path.read_text().strip(),
        "key_path": settings.BACKUP_SSH_KEY_PATH,
        "deploy_instructions": (
            "Add this key to /home/deploy/.ssh/authorized_keys on each VM "
            "to enable passwordless SSH access from the platform."
        ),
    }


@router.get("/hosts")
async def list_ssh_hosts(
    user: dict = Security(get_current_user),
):
    """Return known hosts from the platform inventory for quick-connect."""
    return {"hosts": KNOWN_HOSTS}


@router.websocket("/connect")
async def ssh_proxy(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket SSH proxy — real-time terminal access to managed hosts.

    Protocol:
      1. Connect with ``?token=<JWT>``
      2. Send JSON: ``{"host": "...", "port": 22, "username": "...", "password": "..."}``
      3. Server connects via asyncssh and bridges I/O
      4. Send JSON ``{"type": "resize", "cols": N, "rows": N}`` for terminal resize
      5. All other text messages are forwarded as terminal input
    """
    # ------ Authenticate via JWT in query param ------
    try:
        user = decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = user.get("sub", "unknown")
    await websocket.accept()

    # ------ Receive connection parameters ------
    try:
        init_raw = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
        params = json.loads(init_raw)
    except asyncio.TimeoutError:
        await websocket.send_json({"type": "error", "message": "Timeout waiting for connection parameters"})
        await websocket.close()
        return
    except (json.JSONDecodeError, Exception) as exc:
        await websocket.send_json({"type": "error", "message": f"Invalid connection parameters: {exc}"})
        await websocket.close()
        return

    host = str(params.get("host", "")).strip()
    port = int(params.get("port", 22))
    username = str(params.get("username", "")).strip()
    password = params.get("password") or None

    if not host or not username:
        await websocket.send_json({"type": "error", "message": "host and username are required"})
        await websocket.close()
        return

    # ------ Validate host is in allowed ranges ------
    if not _is_allowed_host(host):
        await websocket.send_json({
            "type": "error",
            "message": f"Host {host} is not in an allowed network range",
        })
        await websocket.close()
        return

    logger.info("SSH proxy: user=%s initiating connection to %s@%s:%d", user_id, username, host, port)
    await websocket.send_json({"type": "status", "message": f"Connecting to {host}:{port}..."})

    conn: asyncssh.SSHClientConnection | None = None
    process: asyncssh.SSHClientProcess | None = None

    try:
        # ------ Build asyncssh connection kwargs ------
        connect_kwargs: dict = {
            "host": host,
            "port": port,
            "username": username,
            "known_hosts": None,  # Internal network — accept all host keys
        }
        if password:
            connect_kwargs["password"] = password
        else:
            # Fall back to platform SSH key
            connect_kwargs["client_keys"] = [settings.BACKUP_SSH_KEY_PATH]

        conn = await asyncio.wait_for(
            asyncssh.connect(**connect_kwargs),
            timeout=15.0,
        )

        process = await conn.create_process(
            term_type="xterm-256color",
            term_size=(80, 24),
        )

        logger.info("SSH proxy: user=%s connected to %s@%s:%d", user_id, username, host, port)
        await websocket.send_json({"type": "connected", "message": f"Connected to {username}@{host}"})

        # ------ Bidirectional bridge ------
        async def ssh_stdout_to_ws():
            """Forward SSH stdout to WebSocket."""
            try:
                while not process.stdout.at_eof():
                    data = await process.stdout.read(4096)
                    if data:
                        await websocket.send_text(data)
            except (asyncssh.Error, WebSocketDisconnect, ConnectionError):
                pass

        async def ssh_stderr_to_ws():
            """Forward SSH stderr to WebSocket."""
            try:
                while not process.stderr.at_eof():
                    data = await process.stderr.read(4096)
                    if data:
                        await websocket.send_text(data)
            except (asyncssh.Error, WebSocketDisconnect, ConnectionError):
                pass

        async def ws_to_ssh():
            """Forward WebSocket input to SSH stdin, handling control messages."""
            try:
                while True:
                    msg = await websocket.receive_text()
                    # Check for JSON control messages (resize, etc.)
                    if msg.startswith("{"):
                        try:
                            ctrl = json.loads(msg)
                            if ctrl.get("type") == "resize":
                                cols = int(ctrl.get("cols", 80))
                                rows = int(ctrl.get("rows", 24))
                                process.change_terminal_size(cols, rows)
                                continue
                        except (json.JSONDecodeError, ValueError):
                            pass  # Not a control message — send as terminal input
                    # Forward raw terminal input
                    process.stdin.write(msg)
            except (WebSocketDisconnect, ConnectionError):
                pass

        # Run all three tasks; when any finishes, cancel the rest
        tasks = [
            asyncio.create_task(ssh_stdout_to_ws()),
            asyncio.create_task(ssh_stderr_to_ws()),
            asyncio.create_task(ws_to_ssh()),
        ]
        _done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()

    except asyncio.TimeoutError:
        logger.warning("SSH proxy: connection to %s:%d timed out (user=%s)", host, port, user_id)
        try:
            await websocket.send_json({"type": "error", "message": f"Connection to {host}:{port} timed out"})
        except Exception:
            pass
    except asyncssh.PermissionDenied:
        logger.warning("SSH proxy: auth failed for %s@%s:%d (user=%s)", username, host, port, user_id)
        try:
            await websocket.send_json({"type": "error", "message": "Authentication failed — check username/password"})
        except Exception:
            pass
    except asyncssh.DisconnectError as exc:
        logger.warning("SSH proxy: disconnect from %s:%d — %s", host, port, exc)
        try:
            await websocket.send_json({"type": "error", "message": f"SSH disconnect: {exc}"})
        except Exception:
            pass
    except asyncssh.Error as exc:
        logger.error("SSH proxy: asyncssh error connecting to %s:%d — %s", host, port, exc)
        try:
            await websocket.send_json({"type": "error", "message": f"SSH error: {exc}"})
        except Exception:
            pass
    except WebSocketDisconnect:
        logger.info("SSH proxy: user=%s disconnected from %s", user_id, host)
    except Exception as exc:
        logger.exception("SSH proxy: unexpected error for %s@%s:%d", username, host, port)
        try:
            await websocket.send_json({"type": "error", "message": f"Unexpected error: {exc}"})
        except Exception:
            pass
    finally:
        if process:
            process.close()
        if conn:
            conn.close()
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("SSH proxy: session ended for user=%s host=%s", user_id, host)
