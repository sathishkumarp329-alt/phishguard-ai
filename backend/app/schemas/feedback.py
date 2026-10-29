"""Feedback Pydantic Schemas."""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FeedbackRequest(BaseModel):
    """Schema to submit user feedback on a scan."""

    scan_id: Optional[uuid.UUID] = None
    feedback_type: str = Field(
        ...,
        description="Type of feedback: false_positive, false_negative, correct, other",
    )
    comment: Optional[str] = Field(None, max_length=1000)


class FeedbackResponse(BaseModel):
    """Schema for returned feedback."""

    id: uuid.UUID
    scan_id: Optional[uuid.UUID] = None
    feedback_type: str
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
