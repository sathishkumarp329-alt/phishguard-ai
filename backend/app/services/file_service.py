"""File Upload Processing and Bulk Document Scan Service."""

import os
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.file_processing.csv_processor import extract_urls_from_csv
from app.file_processing.docx_processor import extract_urls_from_docx
from app.file_processing.image_processor import extract_urls_from_image
from app.file_processing.pdf_processor import extract_urls_from_pdf
from app.models.file_scan import FileScan
from app.schemas.scan import FileScanResponse, ScanResponse
from app.services.scan_service import scan_url


async def process_file(
    db: AsyncSession,
    user_id: uuid.UUID,
    filename: str,
    content: bytes,
    file_type: str,
) -> FileScanResponse:
    """
    Validate file upload, extract embedded URLs, execute security scans,
    and persist file scan telemetry.
    """
    # 1. Size Validation
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    # 2. Determine file category and parse URLs
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    urls: List[str] = []

    if ext == "pdf":
        urls = extract_urls_from_pdf(content)
    elif ext in {"docx", "doc"}:
        urls = extract_urls_from_docx(content)
    elif ext in {"png", "jpg", "jpeg", "webp", "gif", "bmp"}:
        urls = extract_urls_from_image(content)
    elif ext in {"csv", "txt"}:
        urls = extract_urls_from_csv(content, max_urls=settings.MAX_BATCH_URLS)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}'. Supported types: PDF, DOCX, CSV, TXT, PNG, JPG, JPEG.",
        )

    # Cap URLs to MAX_BATCH_URLS
    urls = urls[: settings.MAX_BATCH_URLS]

    # 3. Create FileScan entry
    file_scan = FileScan(
        user_id=user_id,
        filename=filename,
        file_type=ext,
        file_size=len(content),
        status="scanning" if urls else "completed",
        total_urls_found=len(urls),
        urls_scanned=0,
    )
    db.add(file_scan)
    await db.commit()
    await db.refresh(file_scan)

    # 4. Scan each extracted URL
    scanned_results: List[ScanResponse] = []
    first_scan_id = None

    for url in urls:
        try:
            scan_obj = await scan_url(db, user_id=user_id, raw_url=url, scan_type="file")
            scanned_results.append(ScanResponse.model_validate(scan_obj))
            file_scan.urls_scanned += 1
            if not first_scan_id:
                first_scan_id = scan_obj.id
        except Exception:
            # Continue scanning remaining URLs even if one encounters error
            pass

    # 5. Finalize file scan status
    file_scan.status = "completed"
    file_scan.scan_id = first_scan_id
    file_scan.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(file_scan)

    return FileScanResponse(
        id=file_scan.id,
        filename=file_scan.filename,
        file_type=file_scan.file_type,
        file_size=file_scan.file_size,
        status=file_scan.status,
        total_urls=file_scan.total_urls_found,
        urls_scanned=file_scan.urls_scanned,
        results=scanned_results,
        created_at=file_scan.created_at,
        completed_at=file_scan.completed_at,
    )
