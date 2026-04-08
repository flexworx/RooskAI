"""Murph.AI NexGen Server Orchestration Platform — Main Application.

AI-first infrastructure management console for Dell PowerEdge R7625.
Bedrock-only LLM routing (Phase 1, Addendum v1.1).
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import get_settings
from app.core.database import init_db
from app.middleware.audit_middleware import AuditMiddleware
from app.api.routes import auth, health, vms, llm, murph, databases, security, network, metrics, agents, compliance, services, users, ssh, contact, notifications, dcos, runbooks, remote_desktop, lxc, tasks

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info("Starting Murph.AI NexGen Platform v%s", settings.APP_VERSION)
    await init_db()
    logging.info("Database initialized")
    yield
    # Shutdown
    logging.info("Shutting down Murph.AI NexGen Platform")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-First Infrastructure Management Console for Dell PowerEdge R7625. "
        "Manages VMs via Proxmox, routes AI requests through AWS Bedrock, "
        "and integrates with Murph.ai agent ecosystem."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit middleware — every request logged for SOC 2
app.add_middleware(AuditMiddleware)

# Prometheus metrics
if settings.PROMETHEUS_ENABLED:
    Instrumentator().instrument(app).expose(app)

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(vms.router, prefix="/api")
app.include_router(llm.router, prefix="/api")
app.include_router(murph.router)
app.include_router(databases.router, prefix="/api")
app.include_router(security.router, prefix="/api")
app.include_router(network.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(ssh.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(dcos.router, prefix="/api")
app.include_router(runbooks.router, prefix="/api")
app.include_router(remote_desktop.router, prefix="/api")
app.include_router(lxc.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "platform": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "operational",
    }
