"""DNS Resolution and Infrastructure Analysis Module."""

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import ipaddress

try:
    import dns.resolver
    import dns.exception
    HAS_DNS = True
except ImportError:
    dns = None
    HAS_DNS = False

PARKED_IP_LIST = {
    "0.0.0.0",
    "127.0.0.1",
    "199.59.242.150",
    "199.59.242.151",
    "185.53.178.6",
    "185.53.178.7",
    "185.53.178.8",
    "185.53.178.9",
    "34.102.136.180",
    "103.224.182.246",
    "103.224.212.222",
    "208.91.197.27",
}


@dataclass
class DnsAnalysis:
    """Dataclass holding DNS query results and infrastructure findings."""

    hostname: str
    a_records: List[str] = field(default_factory=list)
    aaaa_records: List[str] = field(default_factory=list)
    mx_records: List[str] = field(default_factory=list)
    ns_records: List[str] = field(default_factory=list)
    txt_records: List[str] = field(default_factory=list)
    has_mx: bool = False
    is_parked: bool = False
    hosting_provider: Optional[str] = None
    fast_flux_suspected: bool = False
    status: str = "ok"  # ok, unresolved, error, skipped
    findings: List[Dict[str, Any]] = field(default_factory=list)


def _detect_hosting_provider(ip_str: str) -> Optional[str]:
    """Identify well-known cloud/hosting provider from IPv4 address."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private:
            return "Private/Local Network"

        # Check known provider IP subnets
        cloudflare_subnets = [
            ipaddress.ip_network("104.16.0.0/12"),
            ipaddress.ip_network("172.64.0.0/13"),
            ipaddress.ip_network("162.158.0.0/15"),
            ipaddress.ip_network("188.114.96.0/20"),
        ]
        if any(ip in net for net in cloudflare_subnets):
            return "Cloudflare"

        aws_subnets = [
            ipaddress.ip_network("3.0.0.0/8"),
            ipaddress.ip_network("18.0.0.0/8"),
            ipaddress.ip_network("52.0.0.0/8"),
            ipaddress.ip_network("54.0.0.0/8"),
        ]
        if any(ip in net for net in aws_subnets):
            return "Amazon Web Services (AWS)"

        gcp_subnets = [
            ipaddress.ip_network("34.0.0.0/9"),
            ipaddress.ip_network("35.184.0.0/13"),
        ]
        if any(ip in net for net in gcp_subnets):
            return "Google Cloud Platform"

        msft_subnets = [
            ipaddress.ip_network("13.64.0.0/11"),
            ipaddress.ip_network("20.0.0.0/10"),
            ipaddress.ip_network("40.64.0.0/10"),
        ]
        if any(ip in net for net in msft_subnets):
            return "Microsoft Azure"

    except Exception:
        pass
    return None


def _resolve_dns_sync(hostname: str) -> Dict[str, Any]:
    """Synchronous resolver executed in thread pool."""
    out = {
        "A": [],
        "AAAA": [],
        "MX": [],
        "NS": [],
        "TXT": [],
        "error": None,
    }

    try:
        ipaddress.ip_address(hostname)
        out["A"] = [hostname]
        return out
    except ValueError:
        pass

    if not HAS_DNS:
        import socket
        try:
            _, _, ips = socket.gethostbyname_ex(hostname)
            out["A"] = ips
        except Exception as e:
            out["error"] = str(e)
        return out

    resolver = dns.resolver.Resolver()
    resolver.timeout = 3.0
    resolver.lifetime = 5.0

    for rdtype in ["A", "AAAA", "MX", "NS", "TXT"]:
        try:
            answers = resolver.resolve(hostname, rdtype)
            for rdata in answers:
                out[rdtype].append(rdata.to_text().strip('"'))
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
            continue
        except dns.exception.Timeout:
            out["error"] = "DNS query timeout"
            break
        except Exception as e:
            out["error"] = str(e)

    return out


async def analyze_dns(hostname: str) -> DnsAnalysis:
    """
    Perform comprehensive DNS record analysis for hostname.
    """
    if not hostname:
        return DnsAnalysis(hostname=hostname, status="skipped")

    try:
        data = await asyncio.wait_for(
            asyncio.to_thread(_resolve_dns_sync, hostname),
            timeout=8.0,
        )
    except asyncio.TimeoutError:
        return DnsAnalysis(
            hostname=hostname,
            status="error",
            findings=[{
                "category": "dns",
                "title": "DNS Lookup Timed Out",
                "description": f"DNS resolution for '{hostname}' timed out after 8 seconds.",
                "severity": "medium",
                "source": "dns",
            }],
        )

    a_records = data.get("A", [])
    aaaa_records = data.get("AAAA", [])
    mx_records = data.get("MX", [])
    ns_records = data.get("NS", [])
    txt_records = data.get("TXT", [])

    findings: List[Dict[str, Any]] = []

    # Unresolved host
    if not a_records and not aaaa_records:
        findings.append({
            "category": "dns",
            "title": "Unresolvable Hostname (NXDOMAIN or No IP)",
            "description": f"No A or AAAA records exist for '{hostname}'. Domain may be deactivated or suspended.",
            "severity": "medium",
            "source": "dns",
        })
        return DnsAnalysis(
            hostname=hostname,
            a_records=a_records,
            aaaa_records=aaaa_records,
            mx_records=mx_records,
            ns_records=ns_records,
            txt_records=txt_records,
            status="unresolved",
            findings=findings,
        )

    # Check for parking IPs
    is_parked = any(ip in PARKED_IP_LIST for ip in a_records)
    if is_parked:
        findings.append({
            "category": "dns",
            "title": "Domain Parking IP Detected",
            "description": f"Domain resolves to known parking / advertising infrastructure ({', '.join(a_records)}).",
            "severity": "high",
            "source": "dns",
            "raw_data": {"parked_ips": [ip for ip in a_records if ip in PARKED_IP_LIST]},
        })

    # Hosting provider identification
    hosting_provider = None
    for ip in a_records:
        detected = _detect_hosting_provider(ip)
        if detected:
            hosting_provider = detected
            break

    # Fast flux detection: >5 A records spanning multiple /24 blocks
    fast_flux_suspected = False
    if len(a_records) >= 5:
        subnets = set()
        for ip in a_records:
            try:
                subnets.add(str(ipaddress.ip_network(f"{ip}/24", strict=False)))
            except ValueError:
                pass
        if len(subnets) >= 4:
            fast_flux_suspected = True
            findings.append({
                "category": "dns",
                "title": "Potential Fast-Flux DNS Activity",
                "description": f"Hostname resolves to {len(a_records)} IP addresses across {len(subnets)} distinct /24 networks.",
                "severity": "high",
                "source": "dns",
                "raw_data": {"a_records": a_records},
            })

    # Missing MX records check for email phishing simulation
    has_mx = len(mx_records) > 0
    if not has_mx:
        findings.append({
            "category": "dns",
            "title": "Missing MX Records",
            "description": "Domain lacks Mail Exchange (MX) records, indicating it cannot receive email.",
            "severity": "info",
            "source": "dns",
        })

    return DnsAnalysis(
        hostname=hostname,
        a_records=a_records,
        aaaa_records=aaaa_records,
        mx_records=mx_records,
        ns_records=ns_records,
        txt_records=txt_records,
        has_mx=has_mx,
        is_parked=is_parked,
        hosting_provider=hosting_provider,
        fast_flux_suspected=fast_flux_suspected,
        status="ok",
        findings=findings,
    )
