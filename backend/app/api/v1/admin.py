"""Administrator API Endpoints."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_admin, get_db
from app.models.feedback import AuditLog
from app.models.scan import Scan
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/health",
    summary="System health telemetry",
)
async def system_health(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Inspect status of core infrastructure components."""
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "threat_intel_configured": {
            "virustotal": bool(settings.VIRUSTOTAL_API_KEY),
            "google_safebrowsing": bool(settings.GOOGLE_SAFE_BROWSING_KEY),
        },
    }


@router.get(
    "/stats",
    summary="Platform-wide administrative statistics",
)
async def admin_statistics(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve platform-wide counts of users, scans, and verdicts."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (
        await db.execute(select(func.count(User.id)).where(User.is_active == True))  # noqa: E712
    ).scalar() or 0
    total_scans = (await db.execute(select(func.count(Scan.id)))).scalar() or 0

    verdict_distribution: Dict[str, int] = {}
    v_res = await db.execute(select(Scan.verdict, func.count(Scan.id)).group_by(Scan.verdict))
    for v, c in v_res.all():
        verdict_distribution[v] = c

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_scans": total_scans,
        "verdict_distribution": verdict_distribution,
    }


@router.get(
    "/audit-logs",
    summary="Retrieve paginated administrative audit logs",
)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Fetch paginated audit log entries."""
    count_stmt = select(func.count(AuditLog.id))
    total = (await db.execute(count_stmt)).scalar() or 0

    logs_stmt = (
        select(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    logs = (await db.execute(logs_stmt)).scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "logs": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }
