"""Tests for Platform API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_root_returns_platform_info(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "Murph.AI NexGen Platform"
        assert data["status"] == "operational"
        assert "version" in data

    def test_docs_available(self):
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_spec(self):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert data["info"]["title"] == "Murph.AI NexGen Platform"


class TestAuthRequired:
    """Verify endpoints require authentication."""

    def test_vms_require_auth(self):
        response = client.get("/api/vms/")
        assert response.status_code == 403

    def test_llm_complete_requires_auth(self):
        response = client.post("/api/llm/complete", json={"prompt": "test"})
        assert response.status_code == 403

    def test_murph_status_requires_auth(self):
        response = client.get("/api/murph/status")
        assert response.status_code == 403

    def test_databases_require_auth(self):
        response = client.get("/api/databases/")
        assert response.status_code == 403

    def test_security_alerts_require_auth(self):
        response = client.get("/api/security/alerts")
        assert response.status_code == 403


class TestMurphEndpoints:
    """Test Murph.ai integration endpoint structure."""

    def test_murph_event_rejects_bad_hmac(self):
        response = client.post(
            "/api/murph/event",
            json={
                "agent_id": "test",
                "event_type": "heartbeat",
                "payload": {},
                "timestamp": "2026-02-20T00:00:00Z",
                "sig": "invalid",
            },
        )
        # Should fail HMAC verification
        assert response.status_code in (401, 500)

    def test_murph_command_requires_auth(self):
        response = client.post(
            "/api/murph/command",
            json={
                "agent_id": "test",
                "command": "vm.status",
                "parameters": {},
            },
        )
        assert response.status_code == 403
