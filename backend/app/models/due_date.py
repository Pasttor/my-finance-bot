"""
Due Date Models for the Finance Bot API.
Defines Pydantic models for recurring payments and subscription tracking.
"""
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.transaction import ProjectTag


class DueDateFrequency(str, Enum):
    """Frequency of recurring payments."""
    MENSUAL = "mensual"
    ANUAL = "anual"
    UNICO = "unico"


class DueDateStatus(str, Enum):
    """Status of a due date payment."""
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    VENCIDO = "vencido"


class DueDateBase(BaseModel):
    """Base due date model with common fields."""
    concept: str = Field(..., min_length=1, max_length=200, description="Payment concept/name")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    due_date: date = Field(..., description="Due date for the payment")
    frequency: DueDateFrequency = DueDateFrequency.MENSUAL
    tag: Optional[ProjectTag] = None
    phone_to_notify: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=500)


class DueDateCreate(DueDateBase):
    """Model for creating a new due date."""
    pass


class DueDateUpdate(BaseModel):
    """Model for updating an existing due date."""
    concept: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[Decimal] = Field(None, gt=0)
    due_date: Optional[date] = None
    frequency: Optional[DueDateFrequency] = None
    status: Optional[DueDateStatus] = None
    tag: Optional[ProjectTag] = None
    phone_to_notify: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=500)


class DueDateResponse(DueDateBase):
    """Model for due date response with all fields."""
    id: UUID
    status: DueDateStatus = DueDateStatus.PENDIENTE
    created_at: datetime

    class Config:
        from_attributes = True


class DueDateCalendarItem(BaseModel):
    """Model for calendar display of due dates."""
    id: UUID
    concept: str
    amount: Decimal
    due_date: date
    status: DueDateStatus
    tag: Optional[ProjectTag] = None
    days_until: int = 0  # Positive = future, negative = past
    
    @property
    def is_overdue(self) -> bool:
        return self.days_until < 0 and self.status == DueDateStatus.PENDIENTE
    
    @property
    def is_due_soon(self) -> bool:
        return 0 <= self.days_until <= 3 and self.status == DueDateStatus.PENDIENTE
