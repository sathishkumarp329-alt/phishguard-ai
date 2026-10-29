"""Scan and ScanFinding SQLAlchemy Models."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.file_scan import FileScan


class Scan(Base):
    """Scan record representing a single URL analysis."""

    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_url: Mapped[str] = mapped_column(Text, nullable=False)
    hostname: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, scanning, completed, failed
    verdict: Mapped[str] = mapped_column(
        String(50), default="unable_to_verify", nullable=False
    )  # known_malicious, high_risk, suspicious, no_known_threat, unable_to_verify
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    scan_type: Mapped[str] = mapped_column(
        String(50), default="url", nullable=False
    )  # url, batch, file
    model_confidence: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    scan_duration_ms: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="scans")
    findings: Mapped[List["ScanFinding"]] = relationship(
        "ScanFinding", back_populates="scan", cascade="all, delete-orphan", lazy="selectin"
    )
    file_scan: Mapped[Optional["FileScan"]] = relationship(
        "FileScan", back_populates="scan", uselist=False
    )


class ScanFinding(Base):
    """Specific finding or signal detected during a scan."""

    __tablename__ = "scan_findings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scan_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("scans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # url_structure, domain, dns, tls, redirect, threat_intel, ml, content
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # info, low, medium, high, critical
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")
