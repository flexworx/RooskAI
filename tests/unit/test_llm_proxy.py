"""Tests for LLM Proxy sanitization logic."""

import pytest
from app.services.llm_proxy import sanitize_request


class TestSanitization:
    def test_replaces_private_ips(self):
        result = sanitize_request("Connect to 192.168.10.10 on port 5432")
        assert "[INTERNAL-IP]" in result.text
        assert "192.168.10.10" not in result.text
        assert not result.rejected

    def test_replaces_10x_ips(self):
        result = sanitize_request("Primary DB at 10.20.0.20, replica at 10.20.0.21")
        assert result.text.count("[INTERNAL-IP]") == 2
        assert "10.20.0.20" not in result.text

    def test_replaces_172_ips(self):
        result = sanitize_request("DMZ proxy is 172.16.40.10")
        assert "[INTERNAL-IP]" in result.text

    def test_rejects_sensitive_keywords(self):
        result = sanitize_request("Set the password to admin123")
        assert result.rejected
        assert "REJECTED" in result.actions[0]

    def test_rejects_credential_keyword(self):
        result = sanitize_request("Update the API credential for Bedrock")
        assert result.rejected

    def test_rejects_secret_keyword(self):
        result = sanitize_request("Store this secret in vault")
        assert result.rejected

    def test_replaces_vm_hostnames(self):
        result = sanitize_request("Check VM-DB-01 status and restart VM-APP-01")
        assert result.text.count("[VM-NAME]") == 2
        assert "VM-DB-01" not in result.text

    def test_redacts_internal_paths(self):
        result = sanitize_request("Edit the file at /etc/postgresql/16/main/pg_hba.conf")
        assert "[PATH-REDACTED]" in result.text
        assert "/etc/" not in result.text

    def test_passes_safe_text(self):
        result = sanitize_request("How do I set up ZFS RAIDZ1 with three NVMe drives?")
        assert not result.rejected
        assert len(result.actions) == 0
        assert "ZFS RAIDZ1" in result.text

    def test_combined_sanitization(self):
        result = sanitize_request(
            "Plan: Connect VM-FW-01 at 192.168.10.1 and update /etc/opnsense/config.xml"
        )
        assert not result.rejected
        assert "[VM-NAME]" in result.text
        assert "[INTERNAL-IP]" in result.text
        assert "[PATH-REDACTED]" in result.text

    def test_public_ips_not_sanitized(self):
        result = sanitize_request("The AWS endpoint is at 54.239.28.85")
        assert "54.239.28.85" in result.text
        assert "[INTERNAL-IP]" not in result.text
