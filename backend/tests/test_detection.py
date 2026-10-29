"""
Tests for PhishGuard AI Detection Engine:
- URL Normalization
- Feature Extraction
- Heuristic Rule Engine
- Risk Scoring
"""

import pytest
from app.detection.url_normalizer import normalize_url
from app.detection.url_features import extract_features
from app.detection.rule_engine import evaluate_rules
from app.detection.risk_scoring import calculate_risk_score, RiskAssessment


def test_url_normalization_standard():
    url = "HTTP://Example.COM:80/path/to/page?q=1#section"
    norm = normalize_url(url)
    assert norm.scheme == "http"
    assert norm.hostname == "example.com"
    assert norm.port is None  # Default port stripped
    assert norm.path == "/path/to/page"
    assert norm.is_ip is False


def test_url_normalization_ip():
    url = "http://192.168.1.1:8080/admin"
    norm = normalize_url(url)
    assert norm.hostname == "192.168.1.1"
    assert norm.is_ip is True
    assert norm.port == 8080


def test_feature_extraction_counts():
    url = "https://secure-login.update-account.bank-fake.xyz/auth/verify?session=12345"
    norm = normalize_url(url)
    features = extract_features(norm)

    assert features["suspicious_keyword_count"] >= 3
    assert "login" in features["suspicious_keywords"]
    assert features["is_suspicious_tld"] is True
    assert features["subdomain_depth"] >= 2
    assert features["dot_count"] >= 3
    assert features["hyphen_count"] >= 2


def test_rule_engine_ip_detection():
    norm = normalize_url("http://203.0.113.5/login.html")
    features = extract_features(norm)
    results = evaluate_rules(norm, features)

    matched_names = [r.rule_name for r in results if r.matched]
    assert "ip_address_host" in matched_names


def test_rule_engine_suspicious_tld_and_brand():
    norm = normalize_url("http://paypal-verification-account.xyz/login")
    features = extract_features(norm)
    results = evaluate_rules(norm, features)

    matched_names = [r.rule_name for r in results if r.matched]
    assert "suspicious_tld" in matched_names
    assert "phishing_keywords_in_subdomain" in matched_names or "brand_impersonation" in matched_names


def test_risk_scoring_benign():
    norm = normalize_url("https://www.google.com/search?q=test")
    features = extract_features(norm)
    rule_results = evaluate_rules(norm, features)

    score = calculate_risk_score(
        features=features,
        rule_results=rule_results,
        domain_analysis=None,
        dns_analysis=None,
        tls_analysis=None,
        redirect_analysis=None,
        threat_results=[],
    )

    assert score.risk_score < 40.0
    assert score.verdict == "no_known_threat"


def test_risk_scoring_malicious():
    norm = normalize_url("http://192.0.2.1/paypal/login-verification/update.php")
    features = extract_features(norm)
    rule_results = evaluate_rules(norm, features)

    score = calculate_risk_score(
        features=features,
        rule_results=rule_results,
        domain_analysis=None,
        dns_analysis=None,
        tls_analysis=None,
        redirect_analysis=None,
        threat_results=[],
    )

    assert score.risk_score >= 50.0
    assert score.verdict in ["suspicious", "high_risk", "known_malicious"]


def test_risk_scoring_threat_intel_override():
    norm = normalize_url("http://malicious-credential-harvest.com")
    features = extract_features(norm)
    rule_results = evaluate_rules(norm, features)
    from app.detection.threat_intelligence import ThreatResult
    threats = [
        ThreatResult(provider="virustotal", status="malicious", positives=15, total=72)
    ]
    score = calculate_risk_score(
        features=features,
        rule_results=rule_results,
        domain_analysis=None,
        dns_analysis=None,
        tls_analysis=None,
        redirect_analysis=None,
        threat_results=threats,
    )
    assert score.risk_score >= 90.0
    assert score.verdict == "known_malicious"
