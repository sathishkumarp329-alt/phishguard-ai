"""TLS/SSL Certificate Analysis Module."""

import asyncio
from datetime import datetime, timezone
from dataclasses import dataclass, field
import socket
import ssl
from typing import Any, Dict, List, Optional, Tuple

FREE_CA_SUBSTRINGS = [
    "let's encrypt",
    "zerossl",
    "cloudflare",
    "cpanel",
    "buypass",
    "trustcor",
    "google trust services",
]


@dataclass
class TlsAnalysis:
    """Dataclass holding TLS/SSL certificate telemetry and risk findings."""

    hostname: str
    port: int = 443
    has_tls: bool = False
    issuer: Optional[str] = None
    subject: Optional[str] = None
    san_list: List[str] = field(default_factory=list)
    not_before: Optional[datetime] = None
    not_after: Optional[datetime] = None
    is_expired: bool = False
    days_until_expiry: Optional[int] = None
    is_free_ca: bool = False
    is_self_signed: bool = False
    status: str = "ok"  # ok, no_tls, error, verification_failed
    findings: List[Dict[str, Any]] = field(default_factory=list)


def _format_rdn_tuple(rdn_seq: Any) -> str:
    """Convert RDN tuple from getpeercert to human-readable string."""
    parts = []
    if not rdn_seq:
        return ""
    for rdn in rdn_seq:
        for key, val in rdn:
            parts.append(f"{key}={val}")
    return ", ".join(parts)


def _parse_cert_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse OpenSSL certificate timestamp."""
    if not date_str:
        return None
    for fmt in ("%b %d %H:%M:%S %Y %Z", "%b %d %H:%M:%S %Y GMT"):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _inspect_tls_sync(hostname: str, port: int) -> Tuple[Optional[Dict[str, Any]], bool, Optional[str]]:
    """
    Attempt TLS handshake with hostname and retrieve certificate details.
    Returns: (cert_dict, is_self_signed_or_invalid, error_message)
    """
    # 1. First attempt: standard strict verification
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=4.0) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                return cert, False, None
    except ssl.SSLCertVerificationError as e:
        # Certificate verification failed (e.g. self-signed, untrusted root, expired)
        return None, True, f"Certificate verification failed: {e.verify_message}"
    except (socket.timeout, TimeoutError):
        return None, False, "Connection timed out"
    except (ConnectionRefusedError, socket.gaierror) as e:
        return None, False, f"Connection failed: {str(e)}"
    except Exception as e:
        return None, False, str(e)


async def analyze_tls(hostname: str, port: int = 443) -> TlsAnalysis:
    """
    Asynchronously analyze TLS certificate for a target hostname.
    """
    if not hostname or hostname in {"localhost", "127.0.0.1"}:
        return TlsAnalysis(hostname=hostname, port=port, status="no_tls")

    cert_data, is_untrusted, error_msg = await asyncio.to_thread(_inspect_tls_sync, hostname, port)

    findings: List[Dict[str, Any]] = []

    if is_untrusted:
        findings.append({
            "category": "tls",
            "title": "Untrusted / Self-Signed TLS Certificate",
            "description": f"TLS handshake failed verification: {error_msg}. Attackers frequently use self-signed certificates.",
            "severity": "high",
            "source": "tls",
        })
        return TlsAnalysis(
            hostname=hostname,
            port=port,
            has_tls=True,
            is_self_signed=True,
            status="verification_failed",
            findings=findings,
        )

    if not cert_data:
        findings.append({
            "category": "tls",
            "title": "TLS Not Available or Connection Refused",
            "description": f"Could not establish TLS session on port {port}: {error_msg or 'No response'}",
            "severity": "low",
            "source": "tls",
        })
        return TlsAnalysis(
            hostname=hostname,
            port=port,
            has_tls=False,
            status="no_tls" if "Connection failed" in (error_msg or "") else "error",
            findings=findings,
        )

    # Extract certificate components
    issuer_str = _format_rdn_tuple(cert_data.get("issuer", ()))
    subject_str = _format_rdn_tuple(cert_data.get("subject", ()))

    sans = [val for key, val in cert_data.get("subjectAltName", ()) if key == "DNS"]

    not_before = _parse_cert_date(cert_data.get("notBefore"))
    not_after = _parse_cert_date(cert_data.get("notAfter"))

    now = datetime.now(timezone.utc)
    is_expired = False
    days_until_expiry = None

    if not_after:
        days_until_expiry = (not_after - now).days
        if days_until_expiry < 0:
            is_expired = True
            findings.append({
                "category": "tls",
                "title": "Expired TLS Certificate",
                "description": f"Certificate expired {abs(days_until_expiry)} days ago ({not_after.strftime('%Y-%m-%d')}).",
                "severity": "high",
                "source": "tls",
                "raw_data": {"not_after": not_after.isoformat()},
            })
        elif days_until_expiry < 14:
            findings.append({
                "category": "tls",
                "title": "TLS Certificate Expiring Soon",
                "description": f"Certificate expires in {days_until_expiry} days.",
                "severity": "low",
                "source": "tls",
                "raw_data": {"days_until_expiry": days_until_expiry},
            })

    # Check for free CA
    issuer_lower = issuer_str.lower()
    is_free_ca = any(sub in issuer_lower for sub in FREE_CA_SUBSTRINGS)

    if is_free_ca:
        findings.append({
            "category": "tls",
            "title": "Free / Automated TLS Certificate Authority",
            "description": f"Certificate issued by an automated free CA ({issuer_str}). While widely used legitimately, free CAs are predominant in disposable phishing sites.",
            "severity": "info",
            "source": "tls",
            "raw_data": {"issuer": issuer_str},
        })

    # Hostname mismatch check
    san_match = any(san.lower() == hostname.lower() or (san.startswith("*.") and hostname.lower().endswith(san[1:].lower())) for san in sans)
    if sans and not san_match:
        findings.append({
            "category": "tls",
            "title": "Hostname Mismatch in Subject Alternative Names",
            "description": f"Target hostname '{hostname}' is not present in certificate SANs list.",
            "severity": "medium",
            "source": "tls",
            "raw_data": {"sans": sans[:10]},
        })

    return TlsAnalysis(
        hostname=hostname,
        port=port,
        has_tls=True,
        issuer=issuer_str or None,
        subject=subject_str or None,
        san_list=sans,
        not_before=not_before,
        not_after=not_after,
        is_expired=is_expired,
        days_until_expiry=days_until_expiry,
        is_free_ca=is_free_ca,
        is_self_signed=False,
        status="ok",
        findings=findings,
    )
