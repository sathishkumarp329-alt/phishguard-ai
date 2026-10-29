"""User Feedback API Endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post(
    "/",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit user feedback on a scan result",
)
async def submit_feedback(
    payload: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    """Submit analyst feedback (e.g. false positive, false negative) on scan verdict."""
    fb = Feedback(
        scan_id=payload.scan_id,
        user_id=current_user.id,
        feedback_type=payload.feedback_type,
        comment=payload.comment,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    return FeedbackResponse.model_validate(fb)
