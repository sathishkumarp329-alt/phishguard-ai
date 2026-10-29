"""Domain WHOIS and Age Analysis Module."""

import asyncio
import datetime
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import ipaddress

try:
    import whois
    HAS_WHOIS = True
except ImportError:
    whois = None
    HAS_WHOIS = False


@dataclass
class DomainAnalysis:
    """Dataclass holding WHOIS registration and domain age insights."""

    domain: str
    creation_date: Optional[datetime.datetime] = None
    expiration_date: Optional[datetime.datetime] = None
    updated_date: Optional[datetime.datetime] = None
    registrar: Optional[str] = None
    registrant_org: Optional[str] = None
    registrant_country: Optional[str] = None
    domain_age_days: Optional[int] = None
    days_until_expiry: Optional[int] = None
    is_recently_registered: bool = False
    is_short_lived: bool = False
    is_private_whois: bool = False
    status: str = "ok"  # ok, unavailable, error, skipped
    findings: List[Dict[str, Any]] = field(default_factory=list)


def _normalize_date(date_val: Any) -> Optional[datetime.datetime]:
    """Extract a single datetime from a date value or list of date values."""
    if not date_val:
        return None
    if isinstance(date_val, list):
        date_val = date_val[0]
    if isinstance(date_val, datetime.datetime):
        # Make timezone-naive UTC for comparison
        if date_val.tzinfo:
            return date_val.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        return date_val
    if isinstance(date_val, datetime.date):
        return datetime.datetime.combine(date_val, datetime.time.min)
    return None


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host.strip("[]"))
        return True
    except ValueError:
        return False


def _perform_whois_lookup(domain: str) -> Optional[Any]:
    """Synchronous WHOIS query called inside thread pool."""
    if not HAS_WHOIS:
        return None
    try:
        return whois.whois(domain)
    except Exception:
        return None


async def analyze_domain(hostname: str) -> DomainAnalysis:
    """
    Query and analyze WHOIS data for a given hostname.
    Enforces a strict 10-second timeout and handles all failures gracefully.
    """
    if not hostname or _is_ip(hostname) or hostname in {"localhost", "127.0.0.1"}:
        return DomainAnalysis(
            domain=hostname,
            status="skipped",
            findings=[{
                "category": "domain",
                "title": "WHOIS Skipped for IP / Localhost",
                "description": f"WHOIS query skipped because target '{hostname}' is an IP address or loopback.",
                "severity": "info",
                "source": "whois"
            }]
        )

    # Clean domain
    domain = hostname
    # Strip common subdomains if applicable
    parts = hostname.split(".")
    if len(parts) > 2:
        domain = ".".join(parts[-2:])

    try:
        w = await asyncio.wait_for(
            asyncio.to_thread(_perform_whois_lookup, domain),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        return DomainAnalysis(
            domain=domain,
            status="unavailable",
            findings=[{
                "category": "domain",
                "title": "WHOIS Lookup Timed Out",
                "description": "The WHOIS registry did not respond within 10 seconds.",
                "severity": "info",
                "source": "whois"
            }]
        )
    except Exception as e:
        return DomainAnalysis(
            domain=domain,
            status="error",
            findings=[{
                "category": "domain",
                "title": "WHOIS Lookup Error",
                "description": f"Failed to retrieve WHOIS records: {str(e)}",
                "severity": "info",
                "source": "whois"
            }]
        )

    if not w or not getattr(w, "domain_name", None):
        return DomainAnalysis(
            domain=domain,
            status="unavailable",
            findings=[{
                "category": "domain",
                "title": "WHOIS Data Not Available",
                "description": "No registration records could be retrieved for this domain.",
                "severity": "info",
                "source": "whois"
            }]
        )

    creation_date = _normalize_date(getattr(w, "creation_date", None))
    expiration_date = _normalize_date(getattr(w, "expiration_date", None))
    updated_date = _normalize_date(getattr(w, "updated_date", None))

    registrar = str(getattr(w, "registrar", "") or "")
    org = str(getattr(w, "org", "") or getattr(w, "registrant_org", "") or "")
    country = str(getattr(w, "country", "") or "")

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    domain_age_days: Optional[int] = None
    days_until_expiry: Optional[int] = None
    is_recently_registered = False
    is_short_lived = False

    findings: List[Dict[str, Any]] = []

    if creation_date:
        domain_age_days = (now - creation_date).days
        if domain_age_days < 30:
            is_recently_registered = True
            findings.append({
                "category": "domain",
                "title": "Newly Registered Domain (<30 days)",
                "description": f"Domain was registered only {domain_age_days} days ago ({creation_date.strftime('%Y-%m-%d')}). Phishing infrastructure is predominantly newly provisioned.",
                "severity": "high",
                "source": "whois",
                "raw_data": {"age_days": domain_age_days, "creation_date": creation_date.isoformat()}
            })
        elif domain_age_days < 90:
            findings.append({
                "category": "domain",
                "title": "Young Domain (<90 days)",
                "description": f"Domain is relatively new ({domain_age_days} days old).",
                "severity": "medium",
                "source": "whois",
                "raw_data": {"age_days": domain_age_days}
            })

    if expiration_date:
        days_until_expiry = (expiration_date - now).days
        if days_until_expiry < 30 and days_until_expiry > 0:
            findings.append({
                "category": "domain",
                "title": "Expiring Domain (<30 days)",
                "description": f"Domain expires in {days_until_expiry} days.",
                "severity": "low",
                "source": "whois",
                "raw_data": {"days_until_expiry": days_until_expiry}
            })

    # Check for privacy guard
    privacy_keywords = ["privacy", "proxy", "redacted", "whoisguard", "protect", "withheld"]
    is_private_whois = any(kw in org.lower() for kw in privacy_keywords) or any(kw in registrar.lower() for kw in privacy_keywords)

    return DomainAnalysis(
        domain=domain,
        creation_date=creation_date,
        expiration_date=expiration_date,
        updated_date=updated_date,
        registrar=registrar or None,
        registrant_org=org or None,
        registrant_country=country or None,
        domain_age_days=domain_age_days,
        days_until_expiry=days_until_expiry,
        is_recently_registered=is_recently_registered,
        is_short_lived=is_short_lived,
        is_private_whois=is_private_whois,
        status="ok",
        findings=findings,
    )
