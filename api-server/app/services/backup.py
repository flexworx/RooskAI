"""Database backup service — executes pg_dump on remote database hosts via SSH."""

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import PurePosixPath

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def run_pg_backup(
    host: str,
    port: int,
    database: str = "nexgen_platform",
    db_user: str = "nexgen",
) -> dict:
    """SSH into the database host and run pg_dump.

    Returns:
        dict with keys: success, backup_path, size_bytes, duration_seconds, error
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_dir = settings.BACKUP_DEST_DIR
    backup_filename = f"{database}_{timestamp}.dump"
    backup_path = str(PurePosixPath(backup_dir) / backup_filename)

    ssh_user = settings.BACKUP_SSH_USER
    ssh_key = settings.BACKUP_SSH_KEY_PATH

    # Commands to run on the remote DB host
    commands = (
        f"mkdir -p {backup_dir} && "
        f"pg_dump -h localhost -p {port} -U {db_user} -Fc {database} "
        f"> {backup_path} && "
        f"stat --printf='%s' {backup_path}"
    )

    ssh_cmd = [
        "ssh",
        "-i", ssh_key,
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=10",
        f"{ssh_user}@{host}",
        commands,
    ]

    start_time = datetime.now(timezone.utc)

    try:
        process = await asyncio.create_subprocess_exec(
            *ssh_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=300  # 5 minute timeout for large DBs
        )

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        if process.returncode != 0:
            error_msg = stderr.decode().strip()
            logger.error(f"pg_dump failed on {host}: {error_msg}")
            return {
                "success": False,
                "backup_path": None,
                "size_bytes": 0,
                "duration_seconds": duration,
                "error": error_msg,
            }

        size_bytes = int(stdout.decode().strip()) if stdout.decode().strip().isdigit() else 0
        logger.info(
            f"Backup completed: {backup_path} ({size_bytes} bytes, {duration:.1f}s)"
        )
        return {
            "success": True,
            "backup_path": backup_path,
            "size_bytes": size_bytes,
            "duration_seconds": duration,
            "error": None,
        }

    except asyncio.TimeoutError:
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.error(f"Backup timed out after {duration:.1f}s on {host}")
        return {
            "success": False,
            "backup_path": None,
            "size_bytes": 0,
            "duration_seconds": duration,
            "error": "Backup timed out after 300 seconds",
        }
    except Exception as e:
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.error(f"Backup failed on {host}: {e}")
        return {
            "success": False,
            "backup_path": None,
            "size_bytes": 0,
            "duration_seconds": duration,
            "error": str(e),
        }
