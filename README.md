# MURPH.AI - HSE OPERATIONS CENTER
# NEXGEN SERVER ORCHESTRATION PLATFORM

AI-First Infrastructure Management Console for Dell PowerEdge R7625

## Architecture

| Component | Stack | Location |
|---|---|---|
| Platform API | FastAPI (Python 3.11) | `backend/` |
| Dashboard UI | React 18 + TypeScript + Tailwind | `frontend/` |
| LLM Proxy | FastAPI (Bedrock-only, Phase 1) | `backend/app/services/llm_proxy.py` |
| Infrastructure | Ansible + Terraform | `infrastructure/` |
| Monitoring | Prometheus + Grafana | `monitoring/` |

## Hardware (Confirmed - Addendum v1.1)

- **Server:** Dell PowerEdge R7625
- **CPU:** 2x AMD EPYC 9354 (64 cores / 128 threads)
- **RAM:** 128GB DDR5 (92GB available for VMs)
- **Storage:** 3x 3.84TB NVMe (RAIDZ1 ~7.5TB usable)
- **GPU:** None (Bedrock-only AI until GPU added)

## Quick Start

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Docker (full stack)
docker compose up -d
```

## VM Inventory (v1.1 - 78GB total)

| VM | Role | RAM | Status |
|---|---|---|---|
| VM-FW-01 | OPNsense Firewall | 4GB | Phase 2 |
| VM-IAM-01 | Keycloak IAM | 8GB | Phase 2 |
| VM-SEC-01 | HashiCorp Vault | 6GB | Phase 2 |
| VM-SIEM-01 | Wazuh SIEM | 10GB | Phase 2 |
| VM-APP-01 | Platform API + Dashboard | 12GB | Phase 3 |
| VM-DB-01 | PostgreSQL Primary | 12GB | Phase 4 |
| VM-DB-02 | PostgreSQL Replica | 8GB | Phase 4 |
| VM-MON-01 | Prometheus + Grafana | 8GB | Phase 7 |
| VM-GIT-01 | Gitea | 6GB | Phase 1 |
| VM-PROXY-01 | Nginx Reverse Proxy | 4GB | Phase 3 |
| VM-LLM-01 | Ollama (DEFERRED) | - | Needs GPU |
