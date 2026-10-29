"""SSRF-Protected HTTP Fetcher Module."""

import asyncio
import ipaddress
import socket
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

# Blocked cloud metadata hosts and IP addresses
BLOCKED_METADATA_HOSTS = {
    "169.254.169.254",  # AWS / Azure / GCP / OpenStack metadata
    "169.254.169.253",  # Azure IMDS
    "metadata.google.internal",
    "metadata.internal",
    "100.100.100.200",  # Alibaba Cloud metadata
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
}


@dataclass
class FetchResult:
    """Dataclass holding fetch response data and SSRF status."""

    url: str
    status_code: int
    headers: Dict[str, str]
    body: bytes
    content_type: str
    is_safe: bool = True
    blocked_reason: Optional[str] = None


class SafeFetcher:
    """
    Robust HTTP client preventing Server-Side Request Forgery (SSRF) and resource exhaustion.
    Validates DNS resolution against private and cloud metadata networks prior to connection.
    """

    PRIVATE_NETWORKS = [
        ipaddress.ip_network("127.0.0.0/8"),
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
        ipaddress.ip_network("169.254.0.0/16"),  # Link-local / AWS metadata
        ipaddress.ip_network("100.64.0.0/10"),   # Carrier-grade NAT
        ipaddress.ip_network("192.0.0.0/24"),    # IETF Protocol Assignments
        ipaddress.ip_network("192.0.2.0/24"),    # TEST-NET-1
        ipaddress.ip_network("198.51.100.0/24"), # TEST-NET-2
        ipaddress.ip_network("203.0.113.0/24"),  # TEST-NET-3
        ipaddress.ip_network("224.0.0.0/4"),     # Multicast
        ipaddress.ip_network("240.0.0.0/4"),     # Reserved
        # IPv6
        ipaddress.ip_network("::1/128"),         # Loopback
        ipaddress.ip_network("fc00::/7"),        # Unique Local Address (ULA)
        ipaddress.ip_network("fe80::/10"),       # Link-local
        ipaddress.ip_network("ff00::/8"),        # Multicast
    ]

    def __init__(self, user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PhishGuardAI/1.0"):
        self.user_agent = user_agent

    @classmethod
    def is_private_ip(cls, ip_str: str) -> bool:
        """Verify whether an IP address falls into private, loopback, or reserved space."""
        try:
            ip = ipaddress.ip_address(ip_str.strip("[]"))
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
                return True
            return any(ip in net for net in cls.PRIVATE_NETWORKS)
        except ValueError:
            return True

    @classmethod
    def is_safe_url(cls, url: str) -> bool:
        """Syntactic and host-level check for SSRF danger."""
        try:
            parsed = urlparse(url)
            if parsed.scheme.lower() not in {"http", "https"}:
                return False

            hostname = (parsed.hostname or "").lower().strip()
            if not hostname:
                return False

            if hostname in BLOCKED_METADATA_HOSTS:
                return False

            if cls.is_private_ip(hostname):
                return False

            return True
        except Exception:
            return False

    @classmethod
    async def resolve_and_validate(cls, hostname: str) -> List[str]:
        """
        Resolve hostname via system DNS and verify none of the resolved IPs belong to private or reserved subnets.
        Raises ValueError if an unsafe IP is encountered.
        """
        clean_host = hostname.strip("[]").lower()

        if clean_host in BLOCKED_METADATA_HOSTS:
            raise ValueError(f"SSRF blocked: Host '{hostname}' is in restricted metadata list.")

        # If already IP
        try:
            ip = ipaddress.ip_address(clean_host)
            if cls.is_private_ip(str(ip)):
                raise ValueError(f"SSRF blocked: Target IP '{clean_host}' is in private or reserved network.")
            return [str(ip)]
        except ValueError as e:
            if "SSRF blocked" in str(e):
                raise

        # DNS resolution in thread pool
        def _get_addrinfo(host: str) -> List[str]:
            results = []
            try:
                for entry in socket.getaddrinfo(host, None, socket.AF_UNSPEC, socket.SOCK_STREAM):
                    ip_candidate = entry[4][0]
                    if ip_candidate not in results:
                        results.append(ip_candidate)
            except Exception:
                pass
            return results

        resolved_ips = await asyncio.to_thread(_get_addrinfo, clean_host)
        if not resolved_ips:
            raise ValueError(f"Unable to resolve host '{hostname}' via DNS.")

        for ip in resolved_ips:
            if cls.is_private_ip(ip):
                raise ValueError(f"SSRF blocked: Resolved IP '{ip}' for host '{hostname}' is private or reserved.")

        return resolved_ips

    async def fetch(
        self,
        url: str,
        follow_redirects: bool = False,
        timeout: float = 10.0,
        max_size: int = 5 * 1024 * 1024,  # 5 MB max payload
    ) -> FetchResult:
        """
        Safely fetch an HTTP/HTTPS resource while enforcing size caps and SSRF protections.
        """
        parsed = urlparse(url)
        hostname = parsed.hostname or ""

        # Validate URL and resolve host
        try:
            await self.resolve_and_validate(hostname)
        except ValueError as e:
            return FetchResult(
                url=url,
                status_code=403,
                headers={},
                body=b"",
                content_type="",
                is_safe=False,
                blocked_reason=str(e),
            )

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        try:
            async with httpx.AsyncClient(
                verify=False,  # Allow inspection of suspicious sites with bad certs
                timeout=httpx.Timeout(timeout),
                follow_redirects=follow_redirects,
            ) as client:
                async with client.stream("GET", url, headers=headers) as resp:
                    status_code = resp.status_code
                    resp_headers = dict(resp.headers)
                    content_type = resp_headers.get("content-type", "")

                    body_chunks = []
                    total_bytes = 0

                    async for chunk in resp.aiter_bytes():
                        total_bytes += len(chunk)
                        if total_bytes > max_size:
                            break
                        body_chunks.append(chunk)

                    body = b"".join(body_chunks)

                    return FetchResult(
                        url=str(resp.url),
                        status_code=status_code,
                        headers=resp_headers,
                        body=body,
                        content_type=content_type,
                        is_safe=True,
                    )
        except Exception as e:
            return FetchResult(
                url=url,
                status_code=0,
                headers={},
                body=b"",
                content_type="",
                is_safe=True,
                blocked_reason=f"Connection error: {str(e)}",
            )
