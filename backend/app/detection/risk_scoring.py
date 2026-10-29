"""Multi-Vector Risk Scoring and Verdict Formulation Engine."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.detection.dns_analysis import DnsAnalysis
from app.detection.domain_analysis import DomainAnalysis
from app.detection.redirect_analysis import RedirectAnalysis
from app.detection.rule_engine import RuleResult
from app.detection.threat_intelligence import ThreatResult
from app.detection.tls_analysis import TlsAnalysis


@dataclass
class RiskAssessment:
    """Comprehensive risk calculation output and verdict."""

    score: float  # 0.0 to 100.0
    verdict: str  # known_malicious, high_risk, suspicious, no_known_threat, unable_to_verify
    confidence: float  # 0.0 to 1.0
    category_scores: Dict[str, float] = field(default_factory=dict)
    summary: str = ""

    @property
    def risk_score(self) -> float:
        return self.score


def calculate_risk_score(
    features: Dict[str, Any],
    rule_results: List[RuleResult],
    domain_analysis: DomainAnalysis,
    dns_analysis: DnsAnalysis,
    tls_analysis: TlsAnalysis,
    redirect_analysis: RedirectAnalysis,
    threat_results: List[ThreatResult],
    ml_prediction: Optional[float] = None,
) -> RiskAssessment:
    """
    Synthesize all static, heuristic, network, reputation, and behavioral indicators
    into a unified 0-100 risk score and verdict.
    """
    category_scores: Dict[str, float] = {}
    active_weights: Dict[str, float] = {}

    # 1. Threat Intelligence (Weight: 0.35)
    ti_score = 0.0
    ti_active = False
    has_confirmed_malicious_ti = False

    for tr in threat_results:
        if tr.status == "malicious":
            has_confirmed_malicious_ti = True
            ti_score = max(ti_score, 100.0)
            ti_active = True
        elif tr.status == "suspicious":
            ti_score = max(ti_score, 65.0)
            ti_active = True
        elif tr.status == "clean":
            ti_active = True

    if ti_active:
        category_scores["threat_intel"] = round(ti_score, 1)
        active_weights["threat_intel"] = 0.35
    else:
        category_scores["threat_intel"] = 0.0

    # 2. Heuristic Rules (Weight: 0.25)
    matched_rules = [r for r in rule_results if r.matched]
    rules_score = 0.0
    has_critical_rule = False

    if matched_rules:
        severity_weights = {
            "critical": 100.0,
            "high": 75.0,
            "medium": 45.0,
            "low": 20.0,
            "info": 0.0,
        }
        total_rule_points = sum(severity_weights.get(r.severity, 0.0) * r.weight for r in matched_rules)
        rules_score = min(total_rule_points / 1.5, 100.0)

        if any(r.severity == "critical" for r in matched_rules):
            has_critical_rule = True
            rules_score = max(rules_score, 85.0)

    category_scores["rules"] = round(rules_score, 1)
    active_weights["rules"] = 0.25

    # 3. URL Lexical Features (Weight: 0.15)
    url_feat_score = 0.0
    if features.get("is_ip_address"):
        url_feat_score += 35.0
    if features.get("brand_impersonation_score", 0.0) > 0.5:
        url_feat_score += 40.0
    if features.get("suspicious_keyword_count", 0) > 0:
        url_feat_score += min(features["suspicious_keyword_count"] * 15.0, 30.0)
    if features.get("is_suspicious_tld"):
        url_feat_score += 20.0
    if features.get("hostname_entropy", 0.0) > 4.2:
        url_feat_score += 15.0
    if features.get("is_shortener"):
        url_feat_score += 15.0

    url_feat_score = min(url_feat_score, 100.0)
    category_scores["url_features"] = round(url_feat_score, 1)
    active_weights["url_features"] = 0.15

    # 4. Domain / WHOIS (Weight: 0.10)
    domain_score = 0.0
    domain_active = domain_analysis is not None and domain_analysis.status == "ok"
    if domain_active:
        if domain_analysis.is_recently_registered:
            domain_score = 80.0
        elif (domain_analysis.domain_age_days or 999) < 90:
            domain_score = 40.0
        elif (domain_analysis.days_until_expiry or 999) < 14:
            domain_score = 25.0
        active_weights["domain"] = 0.10
    category_scores["domain"] = round(domain_score, 1)

    # 5. DNS Infrastructure (Weight: 0.05)
    dns_score = 0.0
    dns_active = dns_analysis is not None and dns_analysis.status in {"ok", "unresolved"}
    if dns_active:
        if dns_analysis.is_parked:
            dns_score = 85.0
        elif dns_analysis.fast_flux_suspected:
            dns_score = 80.0
        elif dns_analysis.status == "unresolved":
            dns_score = 40.0
        active_weights["dns"] = 0.05
    category_scores["dns"] = round(dns_score, 1)

    # 6. TLS / Certificate (Weight: 0.05)
    tls_score = 0.0
    tls_active = tls_analysis is not None and tls_analysis.status in {"ok", "verification_failed", "no_tls"}
    if tls_active:
        if tls_analysis.is_self_signed:
            tls_score = 75.0
        elif tls_analysis.is_expired:
            tls_score = 70.0
        elif not tls_analysis.has_tls:
            tls_score = 30.0
        elif tls_analysis.is_free_ca and features.get("suspicious_keyword_count", 0) > 0:
            tls_score = 25.0
        active_weights["tls"] = 0.05
    category_scores["tls"] = round(tls_score, 1)

    # 7. Redirection (Weight: 0.05)
    redirect_score = 0.0
    redirect_active = redirect_analysis is not None and redirect_analysis.status != "error"
    if redirect_active:
        if redirect_analysis.status == "ssrf_blocked":
            redirect_score = 100.0
        elif redirect_analysis.has_loop or redirect_analysis.status == "too_many_redirects":
            redirect_score = 75.0
        elif redirect_analysis.is_cross_domain_redirect:
            redirect_score = 45.0
        active_weights["redirects"] = 0.05
    category_scores["redirects"] = round(redirect_score, 1)

    # Normalize weights across available vectors
    total_weight = sum(active_weights.values())
    if total_weight == 0:
        return RiskAssessment(
            score=0.0,
            verdict="unable_to_verify",
            confidence=0.0,
            category_scores=category_scores,
            summary="All inspection vectors failed or were unavailable.",
        )

    weighted_sum = sum(category_scores[cat] * (weight / total_weight) for cat, weight in active_weights.items())

    # Incorporate ML prediction if provided (0.0 to 1.0)
    if ml_prediction is not None:
        ml_score = ml_prediction * 100.0
        category_scores["ml"] = round(ml_score, 1)
        weighted_sum = weighted_sum * 0.8 + ml_score * 0.2

    # Override: confirmed threat intelligence always produces >= 95
    if has_confirmed_malicious_ti:
        final_score = max(weighted_sum, 95.0)
    elif has_critical_rule:
        final_score = max(weighted_sum, 85.0)
    else:
        final_score = weighted_sum

    final_score = min(max(round(final_score, 1), 0.0), 100.0)

    # Map to verdict
    if has_confirmed_malicious_ti or final_score >= 90.0:
        verdict = "known_malicious"
        summary = "URL is confirmed or highly likely to be malicious phishing infrastructure."
    elif final_score >= 70.0:
        verdict = "high_risk"
        summary = "URL exhibits strong deception and threat indicators. Interaction is dangerous."
    elif final_score >= 40.0:
        verdict = "suspicious"
        summary = "URL displays notable anomalies or suspicious attributes warranting caution."
    else:
        verdict = "no_known_threat"
        summary = "No anomalous or malicious indicators were identified in standard checks."

    # Confidence calculation: ratio of active analyzers to total possible analyzers (7)
    confidence = round(len(active_weights) / 7.0, 2)

    return RiskAssessment(
        score=final_score,
        verdict=verdict,
        confidence=confidence,
        category_scores=category_scores,
        summary=summary,
    )
