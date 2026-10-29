"""
Tests for PhishGuard AI SSRF Defense Engine:
Ensures no private, link-local, cloud metadata, or loopback IPs can be accessed.
"""

import pytest
from app.detection.safe_fetcher import SafeFetcher


def test_ssrf_detects_loopback():
    assert SafeFetcher.is_private_ip("127.0.0.1") is True
    assert SafeFetcher.is_private_ip("127.0.1.5") is True
    assert SafeFetcher.is_private_ip("::1") is True


def test_ssrf_detects_rfc1918_private_ranges():
    assert SafeFetcher.is_private_ip("10.0.0.1") is True
    assert SafeFetcher.is_private_ip("10.254.12.3") is True
    assert SafeFetcher.is_private_ip("172.16.0.5") is True
    assert SafeFetcher.is_private_ip("172.31.255.254") is True
    assert SafeFetcher.is_private_ip("192.168.1.1") is True
    assert SafeFetcher.is_private_ip("192.168.100.50") is True


def test_ssrf_detects_cloud_metadata_ip():
    # AWS, GCP, Azure, OpenStack instance metadata address
    assert SafeFetcher.is_private_ip("169.254.169.254") is True
    # Link local addresses
    assert SafeFetcher.is_private_ip("169.254.1.1") is True


def test_ssrf_allows_public_ips():
    # Google DNS
    assert SafeFetcher.is_private_ip("8.8.8.8") is False
    # Cloudflare DNS
    assert SafeFetcher.is_private_ip("1.1.1.1") is False


def test_ssrf_rejects_disallowed_schemes():
    assert SafeFetcher.is_safe_url("file:///etc/passwd") is False
    assert SafeFetcher.is_safe_url("ftp://ftp.example.com") is False
    assert SafeFetcher.is_safe_url("gopher://127.0.0.1:70") is False
    assert SafeFetcher.is_safe_url("dict://127.0.0.1:2628") is False
    assert SafeFetcher.is_safe_url("javascript:alert(1)") is False
