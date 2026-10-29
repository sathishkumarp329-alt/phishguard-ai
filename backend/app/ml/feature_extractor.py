"""
PhishGuard AI - ML Feature Extractor
Transforms normalized URL objects into fixed-length numeric vectors for model training and inference.
"""

import math
import re
from typing import List, Dict, Any
from app.detection.url_normalizer import NormalizedUrl


FEATURE_NAMES = [
    "url_length",
    "hostname_length",
    "path_length",
    "dot_count",
    "hyphen_count",
    "slash_count",
    "question_mark_count",
    "equal_count",
    "at_symbol_count",
    "percent_count",
    "digit_count",
    "digit_ratio",
    "subdomain_depth",
    "is_ip_address",
    "has_port",
    "suspicious_tld",
    "has_login_keyword",
    "has_security_keyword",
    "has_banking_keyword",
    "has_brand_keyword",
    "shannon_entropy",
    "longest_token_length",
    "consecutive_consonants_max",
    "has_punycode",
]


def calculate_entropy(text: str) -> float:
    """Compute Shannon entropy of a string."""
    if not text:
        return 0.0
    probabilities = [float(text.count(c)) / len(text) for c in set(text)]
    return -sum(p * math.log2(p) for p in probabilities)


def extract_ml_feature_vector(normalized: NormalizedUrl) -> List[float]:
    """
    Extract a 24-dimensional normalized numeric feature vector from a NormalizedUrl.
    """
    url = normalized.normalized_url
    host = normalized.hostname.lower()
    path = normalized.path or ""

    url_len = len(url)
    host_len = len(host)
    path_len = len(path)

    dots = url.count(".")
    hyphens = url.count("-")
    slashes = url.count("/")
    questions = url.count("?")
    equals = url.count("=")
    ats = url.count("@")
    percents = url.count("%")

    digits = sum(c.isdigit() for c in url)
    digit_ratio = digits / max(1, url_len)

    subdomain_depth = len(normalized.subdomain_parts)
    is_ip = 1.0 if normalized.is_ip else 0.0
    has_port = 1.0 if normalized.port is not None else 0.0

    suspicious_tlds = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".loan", ".work", ".download"}
    has_suspicious_tld = 1.0 if any(host.endswith(tld) for tld in suspicious_tlds) else 0.0

    has_login = 1.0 if re.search(r"(login|signin|sign-in|log-in|portal)", url, re.I) else 0.0
    has_security = 1.0 if re.search(r"(secure|verify|account|update|auth|confirm|support)", url, re.I) else 0.0
    has_banking = 1.0 if re.search(r"(bank|wallet|paypal|chase|wellsfargo|citi|wire)", url, re.I) else 0.0
    has_brand = 1.0 if re.search(r"(apple|microsoft|google|netflix|amazon|instagram|facebook)", url, re.I) and not any(
        host.endswith(d) for d in ["apple.com", "microsoft.com", "google.com", "netflix.com", "amazon.com"]
    ) else 0.0

    entropy = calculate_entropy(host)

    tokens = re.split(r"[\.\-\_\/\?\=\&]", url)
    longest_token = max((len(t) for t in tokens if t), default=0)

    # Max consecutive consonants (randomness indicator)
    consonants = re.findall(r"[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]+", host)
    max_consonants = max((len(c) for c in consonants), default=0)

    has_punycode = 1.0 if "xn--" in host else 0.0

    return [
        float(url_len),
        float(host_len),
        float(path_len),
        float(dots),
        float(hyphens),
        float(slashes),
        float(questions),
        float(equals),
        float(ats),
        float(percents),
        float(digits),
        round(digit_ratio, 4),
        float(subdomain_depth),
        is_ip,
        has_port,
        has_suspicious_tld,
        has_login,
        has_security,
        has_banking,
        has_brand,
        round(entropy, 4),
        float(longest_token),
        float(max_consonants),
        has_punycode,
    ]
