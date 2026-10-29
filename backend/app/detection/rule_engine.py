"""Heuristic Rule Engine for Phishing Detection."""

import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.detection.url_normalizer import NormalizedUrl


@dataclass
class RuleResult:
    """Dataclass representing the outcome of an individual rule check."""

    rule_name: str
    matched: bool
    severity: str  # info, low, medium, high, critical
    category: str  # url_structure, domain, content, etc.
    title: str
    description: str
    weight: float  # contribution weight to risk score (0.0 - 1.0)
    raw_data: Optional[Dict[str, Any]] = None


# Cyrillic/Greek confusables frequently abused in IDN homograph attacks
CONFUSABLE_HOMOGLYPHS = {
    '\u0430': 'a', '\u0441': 'c', '\u0435': 'e', '\u043e': 'o',
    '\u0440': 'p', '\u0455': 's', '\u0445': 'x', '\u0443': 'y',
    '\u0456': 'i', '\u0458': 'j', '\u03bf': 'o', '\u03bd': 'v',
    '\u03b1': 'a', '\u03c1': 'p', '\u0442': 't'
}


def _check_homoglyphs(text: str) -> bool:
    """Detect presence of confusable non-ASCII characters or mixed scripts."""
    has_confusable = any(c in CONFUSABLE_HOMOGLYPHS for c in text)
    if has_confusable:
        return True

    # Check for mixed script in decoded IDN
    scripts = set()
    for char in text:
        if char.isalpha():
            try:
                name = unicodedata.name(char)
                script = name.split()[0]
                scripts.add(script)
            except ValueError:
                pass
    return len(scripts) > 1


def evaluate_rules(
    normalized: NormalizedUrl, features: Dict[str, Any]
) -> List[RuleResult]:
    """
    Evaluate deterministic heuristic rules against the URL and extracted features.
    """
    results: List[RuleResult] = []

    # 1. IP Address as Hostname
    is_ip = features.get("is_ip_address", False)
    results.append(
        RuleResult(
            rule_name="ip_address_host",
            matched=is_ip,
            severity="high" if is_ip else "info",
            category="url_structure",
            title="IP Address in Hostname",
            description="The URL uses a raw IP address instead of a domain name, commonly used by attackers to evade domain reputation filters.",
            weight=0.8,
            raw_data={"hostname": normalized.hostname},
        )
    )

    # 2. Excessive Subdomains
    subdomain_depth = features.get("subdomain_depth", 0)
    excessive_subdomains = subdomain_depth > 3
    results.append(
        RuleResult(
            rule_name="excessive_subdomains",
            matched=excessive_subdomains,
            severity="medium" if excessive_subdomains else "info",
            category="url_structure",
            title="Excessive Subdomain Depth",
            description=f"Hostname has {subdomain_depth} subdomain levels (>3), which is frequently used to obfuscate the real target domain.",
            weight=0.5,
            raw_data={"subdomain_parts": normalized.subdomain_parts, "depth": subdomain_depth},
        )
    )

    # 3. Suspicious TLD
    suspicious_tld = features.get("is_suspicious_tld", False)
    tld = features.get("tld", "")
    results.append(
        RuleResult(
            rule_name="suspicious_tld",
            matched=suspicious_tld,
            severity="medium" if suspicious_tld else "info",
            category="domain",
            title="Suspicious Top-Level Domain",
            description=f"The domain uses the '.{tld}' TLD, which is statistically associated with high rates of malicious spam and phishing.",
            weight=0.6,
            raw_data={"tld": tld},
        )
    )

    # 4. Phishing Keywords in Domain / Subdomains
    domain_kws = features.get("suspicious_keywords_domain", [])
    has_domain_kws = len(domain_kws) > 0
    results.append(
        RuleResult(
            rule_name="phishing_keywords_in_domain",
            matched=has_domain_kws,
            severity="high" if has_domain_kws else "info",
            category="domain",
            title="Credential Harvesting Keywords in Domain",
            description=f"Found sensitive keywords ({', '.join(domain_kws)}) in the hostname.",
            weight=0.75,
            raw_data={"keywords": domain_kws},
        )
    )

    # 5. Brand Impersonation / Typosquatting
    brand_score = features.get("brand_impersonation_score", 0.0)
    brands = features.get("impersonated_brands", [])
    brand_impersonated = brand_score >= 0.6
    results.append(
        RuleResult(
            rule_name="brand_impersonation",
            matched=brand_impersonated,
            severity="critical" if brand_score >= 0.85 else "high" if brand_impersonated else "info",
            category="domain",
            title="Brand Impersonation / Typosquatting Detected",
            description=f"Hostname closely mimics known brand(s): {', '.join(brands)} (similarity score: {brand_score}).",
            weight=0.9,
            raw_data={"brands": brands, "score": brand_score},
        )
    )

    # 6. Homoglyph / Lookalike Characters
    has_homoglyphs = _check_homoglyphs(normalized.original_url) or features.get("is_punycode", False)
    results.append(
        RuleResult(
            rule_name="homoglyph_lookalike",
            matched=has_homoglyphs,
            severity="high" if has_homoglyphs else "info",
            category="domain",
            title="Homoglyph / Punycode Deception Detected",
            description="The domain contains confusable unicode characters, mixed scripts, or punycode encoding indicative of visual deception.",
            weight=0.85,
            raw_data={"is_punycode": features.get("is_punycode", False)},
        )
    )

    # 7. URL Shortener Usage
    is_shortener = features.get("is_shortener", False)
    results.append(
        RuleResult(
            rule_name="url_shortener",
            matched=is_shortener,
            severity="low" if is_shortener else "info",
            category="url_structure",
            title="URL Shortening Service Detected",
            description="A URL shortening service is used, which conceals the destination URL from inspection.",
            weight=0.3,
            raw_data={"service": normalized.hostname},
        )
    )

    # 8. Excessive URL Length (>100 chars)
    url_length = features.get("url_length", 0)
    long_url = url_length > 100
    results.append(
        RuleResult(
            rule_name="excessive_url_length",
            matched=long_url,
            severity="low" if long_url else "info",
            category="url_structure",
            title="Excessive URL Length",
            description=f"URL is unusually long ({url_length} characters), commonly used to pad query parameters and hide destination.",
            weight=0.25,
            raw_data={"length": url_length},
        )
    )

    # 9. Suspicious Sensitive Path
    path_kws = features.get("suspicious_keywords_path", [])
    suspicious_path = len(path_kws) > 0 or any(
        normalized.path.startswith(p) for p in ["/wp-admin", "/login", "/signin", "/verify", "/update", "/secure", "/billing"]
    )
    results.append(
        RuleResult(
            rule_name="suspicious_path",
            matched=suspicious_path,
            severity="medium" if suspicious_path else "info",
            category="url_structure",
            title="Sensitive Authentication Path",
            description=f"URL path targets sensitive actions or credential forms: {normalized.path}",
            weight=0.4,
            raw_data={"path": normalized.path, "keywords": path_kws},
        )
    )

    # 10. Data or JavaScript URI
    is_dangerous_uri = features.get("is_data_uri", False) or features.get("is_javascript_uri", False)
    results.append(
        RuleResult(
            rule_name="dangerous_uri_scheme",
            matched=is_dangerous_uri,
            severity="critical" if is_dangerous_uri else "info",
            category="url_structure",
            title="Executable Data or JavaScript URI Scheme",
            description="The URL uses data: or javascript: URI schemes which execute payload directly in the browser.",
            weight=1.0,
            raw_data={"scheme": normalized.scheme},
        )
    )

    # 11. Free Hosting with Auth Keywords
    is_free_hosting = features.get("is_free_hosting", False)
    free_host_abuse = is_free_hosting and (has_domain_kws or suspicious_path)
    results.append(
        RuleResult(
            rule_name="free_hosting_credential_abuse",
            matched=free_host_abuse,
            severity="high" if free_host_abuse else "info",
            category="domain",
            title="Free Hosting Abuse with Login Keywords",
            description="A free hosting provider is hosting credential/login keywords, a pattern typical of phishing kits.",
            weight=0.8,
            raw_data={"hostname": normalized.hostname},
        )
    )

    # 12. '@' Symbol in URL (Basic Auth Deception)
    at_sign = features.get("at_sign_count", 0) > 0
    results.append(
        RuleResult(
            rule_name="at_symbol_deception",
            matched=at_sign,
            severity="high" if at_sign else "info",
            category="url_structure",
            title="Credential Embed '@' Character Deception",
            description="The '@' character in URL directs the browser to ignore text prior to it and connect to the host following it.",
            weight=0.85,
            raw_data={"at_sign_count": features.get("at_sign_count", 0)},
        )
    )

    # 13. Double Slash Redirect in Path
    double_slash = features.get("double_slash_in_path", False)
    results.append(
        RuleResult(
            rule_name="double_slash_redirect",
            matched=double_slash,
            severity="high" if double_slash else "info",
            category="url_structure",
            title="Double Slash Redirection in Path",
            description="Path contains double slash '//' which can be exploited for open redirect attacks.",
            weight=0.7,
            raw_data={"path": normalized.path},
        )
    )

    # 14. Excessive Percent Encoded Characters
    encoded_ratio = features.get("encoded_chars_ratio", 0.0)
    excessive_encoding = encoded_ratio > 0.10
    results.append(
        RuleResult(
            rule_name="excessive_encoding",
            matched=excessive_encoding,
            severity="medium" if excessive_encoding else "info",
            category="url_structure",
            title="High Percentage of Obfuscated Characters",
            description=f"{encoded_ratio * 100:.1f}% of URL consists of percent-encoded hex sequences.",
            weight=0.45,
            raw_data={"encoded_ratio": encoded_ratio},
        )
    )

    return results
