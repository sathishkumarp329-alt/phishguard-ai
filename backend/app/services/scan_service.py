"""URL Detection Pipeline and Scan Orchestration Service."""

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.detection.dns_analysis import analyze_dns
from app.detection.domain_analysis import analyze_domain
from app.detection.redirect_analysis import analyze_redirects
from app.detection.risk_scoring import calculate_risk_score
from app.detection.rule_engine import evaluate_rules
from app.detection.safe_fetcher import SafeFetcher
from app.detection.threat_intelligence import ThreatIntelService
from app.detection.tls_analysis import analyze_tls
from app.detection.url_features import extract_features
from app.detection.url_normalizer import normalize_url
from app.models.scan import Scan, ScanFinding
from app.schemas.dashboard import DashboardStats
from app.schemas.scan import ScanResponse


async def scan_url(
    db: AsyncSession,
    user_id: uuid.UUID,
    raw_url: str,
    scan_type: str = "url",
) -> Scan:
    """
    Execute comprehensive multi-vector inspection pipeline on target URL.
    Persists scan record, individual findings, risk metrics, and audit timestamps.
    """
    start_time = time.time()

    # Step 1: Normalize URL
    normalized = normalize_url(raw_url)

    # Step 2: Create initial Scan row with status='scanning'
    scan = Scan(
        user_id=user_id,
        url=raw_url,
        normalized_url=normalized.normalized_url,
        hostname=normalized.hostname,
        status="scanning",
        verdict="unable_to_verify",
        risk_score=0.0,
        scan_type=scan_type,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    safe_fetcher = SafeFetcher()
    threat_service = ThreatIntelService()

    try:
        # Step 3: Extract static lexical & structural features
        features = extract_features(normalized)

        # Step 4: Evaluate heuristic rules
        rule_results = evaluate_rules(normalized, features)

        # Step 5: Run network, WHOIS, DNS, TLS, and Threat Intel checks concurrently
        port = normalized.port or (443 if normalized.scheme == "https" else 80)
        tls_port = 443 if normalized.scheme == "https" or port == 443 else 443

        domain_task = analyze_domain(normalized.hostname)
        dns_task = analyze_dns(normalized.hostname)
        tls_task = analyze_tls(normalized.hostname, port=tls_port)
        redirect_task = analyze_redirects(normalized.normalized_url, safe_fetcher)
        threat_task = threat_service.check_all_providers(normalized.normalized_url)

        domain_analysis, dns_analysis, tls_analysis, redirect_analysis, threat_results = await asyncio.gather(
            domain_task,
            dns_task,
            tls_task,
            redirect_task,
            threat_task,
        )

        # Step 6: Compute risk score and verdict
        risk_assessment = calculate_risk_score(
            features=features,
            rule_results=rule_results,
            domain_analysis=domain_analysis,
            dns_analysis=dns_analysis,
            tls_analysis=tls_analysis,
            redirect_analysis=redirect_analysis,
            threat_results=threat_results,
        )

        # Step 7: Consolidate findings
        findings_to_insert: List[ScanFinding] = []

        # Matched heuristic rules
        for rule in rule_results:
            if rule.matched:
                findings_to_insert.append(
                    ScanFinding(
                        scan_id=scan.id,
                        category=rule.category,
                        title=rule.title,
                        description=rule.description,
                        severity=rule.severity,
                        source=f"rule:{rule.rule_name}",
                        raw_data=rule.raw_data,
                    )
                )

        # Domain / WHOIS findings
        for f in domain_analysis.findings:
            findings_to_insert.append(
                ScanFinding(
                    scan_id=scan.id,
                    category=f.get("category", "domain"),
                    title=f.get("title", ""),
                    description=f.get("description", ""),
                    severity=f.get("severity", "info"),
                    source=f.get("source", "whois"),
                    raw_data=f.get("raw_data"),
                )
            )

        # DNS findings
        for f in dns_analysis.findings:
            findings_to_insert.append(
                ScanFinding(
                    scan_id=scan.id,
                    category=f.get("category", "dns"),
                    title=f.get("title", ""),
                    description=f.get("description", ""),
                    severity=f.get("severity", "info"),
                    source=f.get("source", "dns"),
                    raw_data=f.get("raw_data"),
                )
            )

        # TLS findings
        for f in tls_analysis.findings:
            findings_to_insert.append(
                ScanFinding(
                    scan_id=scan.id,
                    category=f.get("category", "tls"),
                    title=f.get("title", ""),
                    description=f.get("description", ""),
                    severity=f.get("severity", "info"),
                    source=f.get("source", "tls"),
                    raw_data=f.get("raw_data"),
                )
            )

        # Redirection findings
        for f in redirect_analysis.findings:
            findings_to_insert.append(
                ScanFinding(
                    scan_id=scan.id,
                    category=f.get("category", "redirect"),
                    title=f.get("title", ""),
                    description=f.get("description", ""),
                    severity=f.get("severity", "info"),
                    source=f.get("source", "redirect"),
                    raw_data=f.get("raw_data"),
                )
            )

        # Threat Intel findings
        for tr in threat_results:
            if tr.status in {"malicious", "suspicious"}:
                findings_to_insert.append(
                    ScanFinding(
                        scan_id=scan.id,
                        category="threat_intel",
                        title=f"{tr.provider} Identified Malicious Indicator",
                        description=f"{tr.provider} flagged this URL as {tr.status} ({tr.positives}/{tr.total} engines).",
                        severity="critical" if tr.status == "malicious" else "high",
                        source=f"intel:{tr.provider.lower()}",
                        raw_data=tr.details,
                    )
                )

        if findings_to_insert:
            db.add_all(findings_to_insert)

        # Update scan status and metrics
        elapsed_ms = int((time.time() - start_time) * 1000)
        scan.status = "completed"
        scan.verdict = risk_assessment.verdict
        scan.risk_score = risk_assessment.score
        scan.model_confidence = risk_assessment.confidence
        scan.scan_duration_ms = elapsed_ms
        scan.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(scan)

    except Exception:
        scan.status = "failed"
        scan.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(scan)
        raise

    # Re-query scan eagerly loading findings
    stmt = (
        select(Scan)
        .options(selectinload(Scan.findings))
        .where(Scan.id == scan.id)
    )
    loaded_scan = (await db.execute(stmt)).scalar_one()
    return loaded_scan


async def get_scan(
    db: AsyncSession, scan_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[Scan]:
    """Retrieve scan by ID enforcing server-side ownership."""
    stmt = (
        select(Scan)
        .options(selectinload(Scan.findings))
        .where(Scan.id == scan_id, Scan.user_id == user_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_history(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 10,
    verdict_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[List[Scan], int]:
    """Retrieve paginated scan history for user with optional verdict and text search filters."""
    base_query = select(Scan).where(Scan.user_id == user_id)

    if verdict_filter:
        base_query = base_query.where(Scan.verdict == verdict_filter)

    if search:
        search_pattern = f"%{search.strip()}%"
        base_query = base_query.where(
            (Scan.url.ilike(search_pattern)) | (Scan.hostname.ilike(search_pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(base_query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paged query
    paged_query = (
        base_query.options(selectinload(Scan.findings))
        .order_by(desc(Scan.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    scans = (await db.execute(paged_query)).scalars().all()
    return list(scans), total_count


async def delete_scan(
    db: AsyncSession, scan_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """Delete a scan record strictly owned by the requesting user."""
    stmt = select(Scan).where(Scan.id == scan_id, Scan.user_id == user_id)
    result = await db.execute(stmt)
    scan = result.scalar_one_or_none()

    if not scan:
        return False

    await db.delete(scan)
    await db.commit()
    return True


async def get_dashboard_stats(
    db: AsyncSession, user_id: uuid.UUID
) -> DashboardStats:
    """Calculate aggregate scan statistics and risk distributions for user."""
    # Total scans
    total_scans_stmt = select(func.count(Scan.id)).where(Scan.user_id == user_id)
    total_scans = (await db.execute(total_scans_stmt)).scalar() or 0

    # Categorized counts
    safe_stmt = select(func.count(Scan.id)).where(
        Scan.user_id == user_id, Scan.verdict == "no_known_threat"
    )
    safe_count = (await db.execute(safe_stmt)).scalar() or 0

    suspicious_stmt = select(func.count(Scan.id)).where(
        Scan.user_id == user_id, Scan.verdict == "suspicious"
    )
    suspicious_count = (await db.execute(suspicious_stmt)).scalar() or 0

    malicious_stmt = select(func.count(Scan.id)).where(
        Scan.user_id == user_id,
        Scan.verdict.in_(["known_malicious", "high_risk"]),
    )
    malicious_count = (await db.execute(malicious_stmt)).scalar() or 0

    # Risk distribution breakdown
    risk_distribution = {
        "known_malicious": 0,
        "high_risk": 0,
        "suspicious": 0,
        "no_known_threat": 0,
        "unable_to_verify": 0,
    }
    dist_stmt = (
        select(Scan.verdict, func.count(Scan.id))
        .where(Scan.user_id == user_id)
        .group_by(Scan.verdict)
    )
    dist_res = await db.execute(dist_stmt)
    for verdict, count in dist_res.all():
        if verdict in risk_distribution:
            risk_distribution[verdict] = count

    # Recent scans (latest 5)
    recent_stmt = (
        select(Scan)
        .options(selectinload(Scan.findings))
        .where(Scan.user_id == user_id)
        .order_by(desc(Scan.created_at))
        .limit(5)
    )
    recent_scans = (await db.execute(recent_stmt)).scalars().all()
    recent_responses = [ScanResponse.model_validate(s) for s in recent_scans]

    return DashboardStats(
        total_scans=total_scans,
        safe_count=safe_count,
        suspicious_count=suspicious_count,
        malicious_count=malicious_count,
        recent_scans=recent_responses,
        risk_distribution=risk_distribution,
    )


async def evaluate_url_realtime(raw_url: str) -> Dict[str, Any]:
    """
    Fast zero-storage in-memory evaluation for extension pre-navigation checks
    and public landing page live preview.
    """
    normalized = normalize_url(raw_url)
    features = extract_features(normalized)
    rule_results = evaluate_rules(normalized, features)

    dns_analysis = await analyze_dns(normalized.hostname)
    threat_service = ThreatIntelService()
    threat_results = await threat_service.check_all_providers(normalized.normalized_url)

    risk_assessment = calculate_risk_score(
        features=features,
        rule_results=rule_results,
        domain_analysis=None,
        dns_analysis=dns_analysis,
        tls_analysis=None,
        redirect_analysis=None,
        threat_results=threat_results,
    )

    findings = [
        {
            "category": r.category,
            "title": r.title,
            "description": r.description,
            "severity": r.severity,
        }
        for r in rule_results
        if r.matched
    ]

    matched_titles = [r.title for r in rule_results if r.matched]
    if risk_assessment.risk_score >= 70:
        summary = (
            ", ".join(matched_titles[:3])
            if matched_titles
            else "High risk phishing indicators detected."
        )
    elif risk_assessment.risk_score >= 40:
        summary = "Elevated risk factors detected. Caution advised."
    else:
        summary = "Legitimate destination with no active threat indicators detected."

    return {
        "url": raw_url,
        "hostname": normalized.hostname,
        "verdict": risk_assessment.verdict,
        "risk_score": risk_assessment.risk_score,
        "confidence": risk_assessment.confidence,
        "summary": summary,
        "findings": findings,
    }
