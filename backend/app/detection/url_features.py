"""URL Lexical and Structural Feature Extraction."""

import math
import re
from typing import Any, Dict, List, Set
from collections import Counter

from app.detection.url_normalizer import NormalizedUrl

# Suspicious top-level domains commonly abused in phishing
SUSPICIOUS_TLDS: Set[str] = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "work", "click", "loan",
    "download", "racing", "review", "country", "kim", "cricket", "science",
    "party", "gdn", "mom", "date", "faith", "zip", "mov", "buzz", "rest", "fit"
}

# Free hosting and dynamic DNS providers frequently abused
FREE_HOSTING_DOMAINS: Set[str] = {
    "weebly.com", "wixsite.com", "firebaseapp.com", "web.app", "github.io",
    "gitlab.io", "netlify.app", "vercel.app", "pages.dev", "000webhostapp.com",
    "glitch.me", "surge.sh", "blogspot.com", "wordpress.com", "godaddysites.com",
    "sites.google.com", "duckdns.org", "no-ip.com", "ngrok.io", "loca.lt"
}

# Known URL shorteners
URL_SHORTENERS: Set[str] = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "adf.ly", "bit.do", "cutt.ly", "rb.gy", "tiny.cc", "shorte.st", "bl.ink",
    "rebrand.ly", "v.gd", "qr.ae"
}

# Target brands frequently impersonated in phishing campaigns
TARGET_BRANDS: List[str] = [
    "paypal", "google", "microsoft", "apple", "amazon", "netflix",
    "facebook", "instagram", "chase", "bankofamerica", "wellsfargo",
    "citibank", "binance", "coinbase", "dropbox", "dhl", "fedex",
    "usps", "whatsapp", "linkedin", "office365", "outlook", "icloud"
]

# Sensitive phishing keywords
SUSPICIOUS_KEYWORDS: List[str] = [
    "login", "signin", "sign-in", "log-in", "verify", "verification",
    "account", "update", "banking", "secure", "security", "confirm",
    "password", "credential", "wallet", "support", "billing", "invoice",
    "recover", "suspended", "unlock", "authenticate", "auth", "token",
    "session", "webscr", "cmd", "dispatch", "ebayisapi"
]


def _shannon_entropy(text: str) -> float:
    """Calculate the Shannon entropy of a given text."""
    if not text:
        return 0.0
    length = len(text)
    counts = Counter(text)
    entropy = 0.0
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def _check_brand_impersonation(hostname: str, registrable_domain: str) -> tuple[float, List[str]]:
    """
    Check if hostname or subdomains impersonate a known brand.
    Returns (score 0.0-1.0, list of impersonated brands).
    """
    detected_brands = []
    max_impersonation_score = 0.0

    domain_main = registrable_domain.split(".")[0] if registrable_domain else ""

    for brand in TARGET_BRANDS:
        # Check if brand is an exact substring in subdomains
        if brand in hostname and brand != domain_main:
            detected_brands.append(brand)
            max_impersonation_score = max(max_impersonation_score, 0.9)
            continue

        # Check typo-squatting on domain name: edit distance 1 or 2
        if domain_main and domain_main != brand:
            distance = _levenshtein_distance(domain_main, brand)
            if distance == 1:
                detected_brands.append(brand)
                max_impersonation_score = max(max_impersonation_score, 0.85)
            elif distance == 2 and len(brand) > 5:
                detected_brands.append(brand)
                max_impersonation_score = max(max_impersonation_score, 0.6)

    return max_impersonation_score, detected_brands


def extract_features(normalized: NormalizedUrl) -> Dict[str, Any]:
    """
    Extract 30+ lexical, structural, and heuristic features from a normalized URL.
    """
    url = normalized.normalized_url
    hostname = normalized.hostname
    path = normalized.path
    query = normalized.query
    orig = normalized.original_url.lower()

    # Structural lengths
    url_length = len(url)
    hostname_length = len(hostname)
    path_length = len(path)
    query_length = len(query)

    # Character counts
    dot_count = url.count(".")
    hyphen_count = url.count("-")
    underscore_count = url.count("_")
    slash_count = url.count("/")
    question_mark_count = url.count("?")
    equal_count = url.count("=")
    at_sign_count = orig.count("@")
    double_slash_in_path = "//" in path

    # Alphanumeric ratios
    digits_in_url = sum(c.isdigit() for c in url)
    digit_ratio = round(digits_in_url / max(url_length, 1), 4)

    alpha_in_hostname = [c for c in hostname if c.isalpha()]
    vowels_in_hostname = sum(1 for c in alpha_in_hostname if c in "aeiou")
    vowel_ratio = round(vowels_in_hostname / max(len(alpha_in_hostname), 1), 4)

    # Entropy
    url_entropy = _shannon_entropy(url)
    hostname_entropy = _shannon_entropy(hostname)

    # TLD analysis
    tld = hostname.split(".")[-1] if "." in hostname else ""
    is_suspicious_tld = tld in SUSPICIOUS_TLDS

    # Free hosting & shortener checks
    is_free_hosting = any(
        hostname == domain or hostname.endswith("." + domain)
        for domain in FREE_HOSTING_DOMAINS
    )
    is_shortener = hostname in URL_SHORTENERS

    # Subdomain depth
    subdomain_depth = len(normalized.subdomain_parts)

    # Suspicious keywords search
    matched_keywords = [
        kw for kw in SUSPICIOUS_KEYWORDS
        if kw in url.lower()
    ]
    matched_keywords_domain = [
        kw for kw in SUSPICIOUS_KEYWORDS
        if kw in hostname.lower()
    ]
    matched_keywords_path = [
        kw for kw in SUSPICIOUS_KEYWORDS
        if kw in path.lower()
    ]

    # Brand impersonation check
    brand_score, impersonated_brands = _check_brand_impersonation(
        hostname, normalized.registrable_domain
    )

    # Special schemes / URIs
    is_data_uri = orig.startswith("data:")
    is_javascript_uri = orig.startswith("javascript:")

    # Percent encoding ratio
    encoded_matches = re.findall(r"%[0-9a-fA-F]{2}", orig)
    encoded_chars_count = len(encoded_matches) * 3
    encoded_chars_ratio = round(encoded_chars_count / max(len(orig), 1), 4)

    # Specific patterns
    has_consecutive_hyphens = "--" in hostname
    is_punycode = "xn--" in hostname
    has_port = normalized.port is not None
    is_ip = normalized.is_ip

    return {
        "url_length": url_length,
        "hostname_length": hostname_length,
        "path_length": path_length,
        "query_length": query_length,
        "dot_count": dot_count,
        "hyphen_count": hyphen_count,
        "underscore_count": underscore_count,
        "slash_count": slash_count,
        "question_mark_count": question_mark_count,
        "equal_count": equal_count,
        "at_sign_count": at_sign_count,
        "double_slash_in_path": double_slash_in_path,
        "digit_ratio": digit_ratio,
        "vowel_ratio": vowel_ratio,
        "url_entropy": url_entropy,
        "hostname_entropy": hostname_entropy,
        "is_ip_address": is_ip,
        "has_port": has_port,
        "port": normalized.port,
        "subdomain_depth": subdomain_depth,
        "subdomain_count": subdomain_depth,
        "is_suspicious_tld": is_suspicious_tld,
        "tld": tld,
        "is_free_hosting": is_free_hosting,
        "is_shortener": is_shortener,
        "suspicious_keyword_count": len(matched_keywords),
        "suspicious_keywords": matched_keywords,
        "suspicious_keywords_domain": matched_keywords_domain,
        "suspicious_keywords_path": matched_keywords_path,
        "brand_impersonation_score": brand_score,
        "impersonated_brands": impersonated_brands,
        "is_data_uri": is_data_uri,
        "is_javascript_uri": is_javascript_uri,
        "encoded_chars_count": len(encoded_matches),
        "encoded_chars_ratio": encoded_chars_ratio,
        "has_consecutive_hyphens": has_consecutive_hyphens,
        "is_punycode": is_punycode,
    }
