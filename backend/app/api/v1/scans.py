"""Security Scan API Endpoints."""

import math
import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.limiter import limiter
from app.detection.report_generator import generate_csv_report, generate_report
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.scan import (
    BatchScanRequest,
    BatchScanResponse,
    FileScanResponse,
    ScanHistoryResponse,
    ScanResponse,
    ScanUrlRequest,
)
from app.services import file_service, scan_service

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post(
    "/realtime-check",
    summary="Fast in-memory URL check for browser extension and preview",
)
@limiter.limit("60/minute")
async def realtime_url_check(
    request: Request,
    payload: ScanUrlRequest,
) -> dict:
    """Zero-storage in-memory check for browser extension pre-navigation protection."""
    return await scan_service.evaluate_url_realtime(payload.url)


@router.post(
    "/url",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Scan a single URL",
)
@router.post(
    "",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@limiter.limit(settings.RATE_LIMIT_SCAN)
async def scan_single_url(
    request: Request,
    payload: ScanUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanResponse:
    """Analyze a single target URL through the complete multi-vector inspection pipeline."""
    scan = await scan_service.scan_url(
        db, user_id=current_user.id, raw_url=payload.url, scan_type="url"
    )
    return ScanResponse.model_validate(scan)


@router.post(
    "/batch",
    response_model=BatchScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan a batch of URLs",
)
@limiter.limit(settings.RATE_LIMIT_SCAN)
async def scan_url_batch(
    request: Request,
    payload: BatchScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BatchScanResponse:
    """Scan up to 100 URLs concurrently in a batch."""
    results = []
    completed = 0
    failed = 0

    for raw_url in payload.urls:
        try:
            scan = await scan_service.scan_url(
                db, user_id=current_user.id, raw_url=raw_url, scan_type="batch"
            )
            results.append(ScanResponse.model_validate(scan))
            completed += 1
        except Exception:
            failed += 1

    return BatchScanResponse(
        total=len(payload.urls),
        completed=completed,
        failed=failed,
        results=results,
    )


@router.post(
    "/file",
    response_model=FileScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload file to extract and scan embedded URLs",
)
@limiter.limit(settings.RATE_LIMIT_SCAN)
async def upload_and_scan_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileScanResponse:
    """Extract embedded URLs from PDF, DOCX, CSV, TXT, or Image files and run inspection."""
    content = await file.read()
    return await file_service.process_file(
        db=db,
        user_id=current_user.id,
        filename=file.filename or "uploaded_file",
        content=content,
        file_type=file.content_type or "application/octet-stream",
    )


@router.get(
    "/history",
    response_model=ScanHistoryResponse,
    summary="Get paginated scan history",
)
@router.get(
    "",
    response_model=ScanHistoryResponse,
    include_in_schema=False,
)
async def get_scan_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    verdict: Optional[str] = Query(None, description="Filter by verdict"),
    search: Optional[str] = Query(None, description="Search by URL or hostname"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanHistoryResponse:
    """Retrieve user's historical scans with optional filtering and search."""
    scans, total = await scan_service.get_history(
        db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        verdict_filter=verdict,
        search=search,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    scan_responses = [ScanResponse.model_validate(s) for s in scans]

    return ScanHistoryResponse(
        scans=scan_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{scan_id}",
    response_model=ScanResponse,
    summary="Get detailed scan result by ID",
)
async def get_scan_by_id(
    scan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanResponse:
    """Retrieve full scan details and findings strictly owned by the caller."""
    scan = await scan_service.get_scan(db, scan_id=scan_id, user_id=current_user.id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or access denied.",
        )
    return ScanResponse.model_validate(scan)


@router.delete(
    "/{scan_id}",
    response_model=MessageResponse,
    summary="Delete scan record",
)
async def delete_scan_by_id(
    scan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Delete a scan record owned by the authenticated user."""
    success = await scan_service.delete_scan(
        db, scan_id=scan_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or access denied.",
        )
    return MessageResponse(message="Scan record deleted.")


@router.get(
    "/{scan_id}/report",
    summary="Export scan report (JSON or CSV)",
)
async def export_scan_report(
    scan_id: uuid.UUID,
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export formatted scan report in JSON or CSV format."""
    scan = await scan_service.get_scan(db, scan_id=scan_id, user_id=current_user.id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or access denied.",
        )

    if format == "csv":
        csv_data = generate_csv_report(scan, scan.findings)
        return PlainTextResponse(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=scan_{scan.id}.csv"},
        )

    return Response(
        content=str(generate_report(scan, scan.findings)),
        media_type="application/json",
    )
