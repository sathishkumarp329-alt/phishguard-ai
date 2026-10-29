"""
Tests for PhishGuard AI Scan Pipeline and Realtime Check.
"""

import pytest
import asyncio
from app.services.scan_service import evaluate_url_realtime


@pytest.mark.asyncio
async def test_realtime_check_benign():
    result = await evaluate_url_realtime("https://www.google.com")
    assert result["hostname"] == "google.com"
    assert result["verdict"] in ["no_known_threat", "unable_to_verify"]
    assert result["risk_score"] < 40.0
    assert "summary" in result
    assert isinstance(result["findings"], list)


@pytest.mark.asyncio
async def test_realtime_check_phishing_heuristic():
    # Synthetic phishing target with brand spoofing and credential harvesting path
    result = await evaluate_url_realtime("http://paypal-security-account.xyz/login/verify.php")
    assert result["hostname"] == "paypal-security-account.xyz"
    assert result["risk_score"] >= 70.0
    assert result["verdict"] in ["high_risk", "known_malicious"]
    assert len(result["findings"]) > 0
