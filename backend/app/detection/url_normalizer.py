"""URL Normalization and Parsing Module."""

import ipaddress
import posixpath
import re
from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlparse, urlunparse

# Common multi-part ccTLDs
TWO_PART_TLDS = {
    "co.uk", "org.uk", "me.uk", "gov.uk", "ac.uk",
    "com.au", "net.au", "org.au", "edu.au", "gov.au",
    "co.nz", "net.nz", "org.nz",
    "co.jp", "ne.jp", "ac.jp",
    "co.in", "net.in", "org.in", "gen.in",
    "com.br", "net.br", "org.br",
    "com.cn", "net.cn", "org.cn",
    "co.za", "org.za",
    "com.sg", "edu.sg",
    "com.mx", "gob.mx",
    "co.kr", "ne.kr",
}


@dataclass
class NormalizedUrl:
    """Dataclass holding all normalized URL components."""

    original_url: str
    normalized_url: str
    scheme: str
    hostname: str
    port: Optional[int]
    path: str
    query: str
    fragment: str
    registrable_domain: str
    subdomain_parts: List[str] = field(default_factory=list)
    is_ip: bool = False


def _is_ip_address(host: str) -> bool:
    """Check if host string is a valid IPv4 or IPv6 address."""
    clean_host = host.strip("[]")
    try:
        ipaddress.ip_address(clean_host)
        return True
    except ValueError:
        return False


def _extract_domain_and_subdomains(hostname: str, is_ip: bool) -> tuple[str, List[str]]:
    """Extract registrable domain (e.g. example.com) and list of subdomains."""
    if is_ip or not hostname:
        return hostname, []

    parts = hostname.split(".")
    if len(parts) <= 1:
        return hostname, []

    # Check for known two-part TLDs (e.g., example.co.uk)
    if len(parts) >= 3:
        two_part_tld = f"{parts[-2]}.{parts[-1]}"
        if two_part_tld in TWO_PART_TLDS:
            registrable_domain = f"{parts[-3]}.{two_part_tld}"
            subdomains = parts[:-3]
            return registrable_domain, subdomains

    # Standard TLD (e.g. sub.example.com)
    registrable_domain = f"{parts[-2]}.{parts[-1]}"
    subdomains = parts[:-2]
    return registrable_domain, subdomains


def normalize_url(url: str) -> NormalizedUrl:
    """
    Perform RFC 3986 compliant normalization of a URL.
    
    1. Trims whitespace and control characters.
    2. Defaults scheme to 'http' if omitted.
    3. Lowercases scheme and hostname.
    4. Handles IDN (punycode) conversion.
    5. Decodes unnecessary percent-encoding.
    6. Removes default ports (80 for http, 443 for https).
    7. Resolves relative path segments (., ..).
    8. Normalizes empty paths to '/'.
    """
    raw = url.strip()
    # Remove control characters
    raw = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", raw)

    # If scheme missing, prepend http://
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+\-.]*://", raw):
        if raw.startswith("//"):
            raw = "http:" + raw
        else:
            raw = "http://" + raw

    parsed = urlparse(raw)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc

    # Extract userinfo if present
    userinfo = ""
    host_port = netloc
    if "@" in host_port:
        userinfo, host_port = host_port.split("@", 1)
        userinfo = userinfo + "@"

    # Separate host and port
    hostname = host_port
    port = None
    if ":" in host_port:
        # Check for IPv6 in brackets
        if host_port.startswith("["):
            bracket_end = host_port.find("]")
            if bracket_end != -1 and bracket_end + 1 < len(host_port) and host_port[bracket_end + 1] == ":":
                hostname = host_port[: bracket_end + 1]
                port_str = host_port[bracket_end + 2 :]
                try:
                    port = int(port_str)
                except ValueError:
                    port = None
            else:
                hostname = host_port
        else:
            parts = host_port.split(":", 1)
            hostname = parts[0]
            try:
                port = int(parts[1])
            except ValueError:
                port = None

    hostname = hostname.lower().strip(".").strip()

    # Handle Punycode/IDN
    try:
        # Encode to ASCII punycode then decode for clean standard form
        hostname = hostname.encode("idna").decode("ascii")
    except Exception:
        pass

    # Check if host is IP
    is_ip = _is_ip_address(hostname)

    # Normalize default ports
    normalized_port = port
    if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
        normalized_port = None

    # Construct clean netloc
    clean_netloc = userinfo + hostname
    if normalized_port is not None:
        clean_netloc += f":{normalized_port}"

    # Normalize path
    path = parsed.path
    if not path:
        path = "/"
    else:
        # Unquote safe percent-encoded characters
        path = unquote(path)
        # Collapse multiple slashes and resolve relative segments
        path = posixpath.normpath(path)
        if parsed.path.endswith("/") and not path.endswith("/"):
            path += "/"
        if not path.startswith("/"):
            path = "/" + path

    # Query & Fragment
    query = parsed.query
    fragment = parsed.fragment

    # Reconstruct normalized URL
    normalized_str = urlunparse((scheme, clean_netloc, path, parsed.params, query, fragment))

    registrable_domain, subdomains = _extract_domain_and_subdomains(hostname, is_ip)

    return NormalizedUrl(
        original_url=url,
        normalized_url=normalized_str,
        scheme=scheme,
        hostname=hostname,
        port=normalized_port,
        path=path,
        query=query,
        fragment=fragment,
        registrable_domain=registrable_domain,
        subdomain_parts=subdomains,
        is_ip=is_ip,
    )
