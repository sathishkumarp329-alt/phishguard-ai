"""Dashboard Pydantic Schemas."""

from typing import Dict, List
from pydantic import BaseModel, ConfigDict

from app.schemas.scan import ScanResponse


class DashboardStats(BaseModel):
    """Aggregate statistics for user dashboard."""

    total_scans: int
    suspicious_count: int
    malicious_count: int
    safe_count: int
    recent_scans: List[ScanResponse]
    risk_distribution: Dict[str, int]

    model_config = ConfigDict(from_attributes=True)
