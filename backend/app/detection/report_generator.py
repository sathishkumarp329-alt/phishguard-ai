"""Report Generation Module for Security Scans."""

import csv
import io
from typing import Any, Dict, List

from app.models.scan import Scan, ScanFinding


def generate_report(scan: Scan, findings: List[ScanFinding]) -> Dict[str, Any]:
    """
    Generate a detailed structured dictionary report for a scan and its findings.
    """
    return {
        "scan_metadata": {
            "id": str(scan.id),
            "target_url": scan.url,
            "normalized_url": scan.normalized_url,
            "hostname": scan.hostname,
            "status": scan.status,
            "verdict": scan.verdict,
            "risk_score": scan.risk_score,
            "scan_type": scan.scan_type,
            "model_confidence": scan.model_confidence,
            "duration_ms": scan.scan_duration_ms,
            "created_at": scan.created_at.isoformat() if scan.created_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        },
        "findings_summary": {
            "total_findings": len(findings),
            "critical_count": sum(1 for f in findings if f.severity == "critical"),
            "high_count": sum(1 for f in findings if f.severity == "high"),
            "medium_count": sum(1 for f in findings if f.severity == "medium"),
            "low_count": sum(1 for f in findings if f.severity == "low"),
            "info_count": sum(1 for f in findings if f.severity == "info"),
        },
        "findings": [
            {
                "id": str(f.id),
                "category": f.category,
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "source": f.source,
                "raw_data": f.raw_data,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in findings
        ],
    }


def generate_csv_report(scan: Scan, findings: List[ScanFinding]) -> str:
    """
    Generate RFC 4180 compliant CSV export of scan metadata and findings.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["PHISHGUARD AI - SECURITY SCAN REPORT"])
    writer.writerow(["Scan ID", str(scan.id)])
    writer.writerow(["Target URL", scan.url])
    writer.writerow(["Hostname", scan.hostname])
    writer.writerow(["Verdict", scan.verdict])
    writer.writerow(["Risk Score (0-100)", f"{scan.risk_score:.1f}"])
    writer.writerow(["Scan Duration (ms)", scan.scan_duration_ms or "N/A"])
    writer.writerow(["Created At", scan.created_at.isoformat() if scan.created_at else "N/A"])
    writer.writerow([])

    # Findings section
    writer.writerow(["Finding ID", "Category", "Severity", "Title", "Description", "Source"])
    for f in findings:
        writer.writerow([
            str(f.id),
            f.category,
            f.severity.upper(),
            f.title,
            f.description,
            f.source,
        ])

    return output.getvalue()
