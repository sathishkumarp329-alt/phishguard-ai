"""HTTP Redirection Chain Analysis Module."""

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, List, Set
from urllib.parse import urljoin, urlparse

from app.detection.safe_fetcher import SafeFetcher


@dataclass
class RedirectHop:
    """Dataclass holding telemetry for an individual redirection hop."""

    hop_number: int
    url: str
    status_code: int
    headers: Dict[str, str] = field(default_factory=dict)
    is_cross_domain: bool = False


@dataclass
class RedirectAnalysis:
    """Dataclass holding complete redirection sequence analysis."""

    original_url: str
    final_url: str
    hops: List[RedirectHop] = field(default_factory=list)
    total_hops: int = 0
    is_cross_domain_redirect: bool = False
    has_loop: bool = False
    status: str = "ok"  # ok, loop_detected, too_many_redirects, ssrf_blocked, error
    findings: List[Dict[str, Any]] = field(default_factory=list)


async def analyze_redirects(
    url: str,
    safe_fetcher: SafeFetcher,
    max_hops: int = 10,
) -> RedirectAnalysis:
    """
    Trace and analyze HTTP redirection hops with strict per-hop SSRF validation.
    """
    current_url = url
    visited_urls: Set[str] = set()
    hops: List[RedirectHop] = []
    findings: List[Dict[str, Any]] = []

    orig_parsed = urlparse(url)
    orig_host = (orig_parsed.hostname or "").lower()

    is_cross_domain = False
    has_loop = False
    status = "ok"

    for hop_idx in range(1, max_hops + 1):
        if current_url in visited_urls:
            has_loop = True
            status = "loop_detected"
            findings.append({
                "category": "redirect",
                "title": "Redirection Loop Detected",
                "description": f"URL redirected back to previously visited URL: {current_url}",
                "severity": "medium",
                "source": "redirect",
            })
            break

        visited_urls.add(current_url)

        # Fetch current hop with follow_redirects=False to inspect response headers
        res = await safe_fetcher.fetch(current_url, follow_redirects=False, timeout=8.0)

        if not res.is_safe:
            status = "ssrf_blocked"
            findings.append({
                "category": "redirect",
                "title": "Redirection Blocked by SSRF Protection",
                "description": f"Redirection path attempted access to restricted/private address: {res.blocked_reason}",
                "severity": "critical",
                "source": "redirect",
            })
            break

        # Check domain deviation
        curr_parsed = urlparse(current_url)
        curr_host = (curr_parsed.hostname or "").lower()
        hop_is_cross_domain = curr_host != orig_host
        if hop_is_cross_domain:
            is_cross_domain = True

        hop = RedirectHop(
            hop_number=hop_idx,
            url=current_url,
            status_code=res.status_code,
            headers={k: v for k, v in res.headers.items() if k.lower() in {"location", "server", "content-type"}},
            is_cross_domain=hop_is_cross_domain,
        )
        hops.append(hop)

        # Check if HTTP 3xx redirect
        if res.status_code in {301, 302, 303, 307, 308}:
            location = res.headers.get("location") or res.headers.get("Location")
            if not location:
                # Malformed redirect with no Location header
                break
            # Resolve relative redirects
            next_url = urljoin(current_url, location)
            current_url = next_url
        else:
            # Reached final destination
            break
    else:
        # Loop finished without breaking: hit max hops
        status = "too_many_redirects"
        findings.append({
            "category": "redirect",
            "title": "Excessive Redirection Hops (>10)",
            "description": "Chain exceeded 10 redirection steps, commonly used to evade static analysis.",
            "severity": "high",
            "source": "redirect",
        })

    total_hops = len(hops)

    if total_hops > 1 and is_cross_domain:
        dest_host = urlparse(current_url).hostname or ""
        findings.append({
            "category": "redirect",
            "title": "Cross-Domain Redirection Detected",
            "description": f"URL redirects across different domains: '{orig_host}' -> '{dest_host}'.",
            "severity": "medium",
            "source": "redirect",
            "raw_data": {"initial_host": orig_host, "final_host": dest_host, "total_hops": total_hops},
        })

    return RedirectAnalysis(
        original_url=url,
        final_url=current_url,
        hops=hops,
        total_hops=total_hops,
        is_cross_domain_redirect=is_cross_domain,
        has_loop=has_loop,
        status=status,
        findings=findings,
    )
