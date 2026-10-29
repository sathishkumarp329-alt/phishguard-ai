"""Scan and Detection Pydantic Schemas."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ScanUrlRequest(BaseModel):
    """Request schema to scan a single URL."""

    url: str = Field(..., min_length=1, max_length=2048, description="URL to scan")


class BatchScanRequest(BaseModel):
    """Request schema to scan multiple URLs."""

    urls: List[str] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of URLs to scan (up to 100)",
    )


class ScanFindingResponse(BaseModel):
    """Schema for individual scan finding."""

    id: uuid.UUID
    category: str
    title: str
    description: str
    severity: str
    source: str
    raw_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanResponse(BaseModel):
    """Schema for complete scan result."""

    id: uuid.UUID
    url: str
    normalized_url: str
    hostname: str
    status: str
    verdict: str
    risk_score: float
    scan_type: str
    model_confidence: Optional[float] = None
    scan_duration_ms: Optional[int] = None
    findings: List[ScanFindingResponse] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ScanHistoryResponse(BaseModel):
    """Paginated scan history response."""

    scans: List[ScanResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BatchScanResponse(BaseModel):
    """Response schema for batch scan operations."""

    total: int
    completed: int
    failed: int
    results: List[ScanResponse]


class FileScanResponse(BaseModel):
    """Schema for file upload scan response."""

    id: uuid.UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    total_urls: int
    urls_scanned: int
    results: List[ScanResponse] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
