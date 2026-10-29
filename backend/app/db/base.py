"""SQLAlchemy Declarative Base and model metadata."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass


# Import all models for Alembic metadata tracking
from app.models.user import User  # noqa: F401, E402
from app.models.scan import Scan, ScanFinding  # noqa: F401, E402
from app.models.file_scan import FileScan  # noqa: F401, E402
from app.models.password_reset import PasswordReset  # noqa: F401, E402
from app.models.feedback import Feedback, AuditLog  # noqa: F401, E402
