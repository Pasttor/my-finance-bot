"""
Transaction Models for the Finance Bot API.
Defines Pydantic models for transaction data validation and serialization.
"""
from datetime import date as date_type, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class TransactionType(str, Enum):
    """Transaction type enumeration."""
    INGRESO = "ingreso"
    GASTO = "gasto"
    INVERSION = "inversion"
    SUSCRIPCION = "suscripcion"


class PaymentStatus(str, Enum):
    """Payment status enumeration for recurring payments."""
    PENDIENTE = "pendiente"
    VENCIDO = "vencido"
    PAGADO = "pagado"


class ProjectTag(str, Enum):
    """Project tag enumeration for categorizing transactions."""
    ASCES = "#Asces"
    LABCASA = "#LabCasa"
    PERSONAL = "#Personal"


class TransactionBase(BaseModel):
    """Base transaction model with common fields."""
    amount: Decimal = Field(..., gt=0, description="Transaction amount (positive)")
    description: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., min_length=1, max_length=100)
    transaction_type: TransactionType = Field(default=TransactionType.GASTO, alias="type")
    transaction_date: date_type = Field(default_factory=date_type.today, alias="date")
    tag: Optional[ProjectTag] = None
    account_source: Optional[str] = Field(default="Efectivo", max_length=50)
    is_recurring: bool = False
    currency: str = Field(default="MXN", max_length=3)
    payment_status: Optional[str] = Field(default="pendiente")

    model_config = {"populate_by_name": True}

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v):
        """Ensure amount is a valid positive decimal."""
        if isinstance(v, str):
            v = Decimal(v.replace(",", "").replace("$", ""))
        return abs(Decimal(v))
    
    @field_validator("account_source", mode="before")
    @classmethod
    def validate_account_source(cls, v):
        """Default None to 'Efectivo'."""
        return v if v is not None else "Efectivo"



class TransactionCreate(TransactionBase):
    """Model for creating a new transaction."""
    raw_message_id: Optional[int] = None


class TransactionUpdate(BaseModel):
    """Model for updating an existing transaction."""
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    transaction_type: Optional[TransactionType] = Field(None, alias="type")
    transaction_date: Optional[date_type] = Field(None, alias="date")
    tag: Optional[ProjectTag] = None
    account_source: Optional[str] = Field(None, max_length=50)
    is_recurring: Optional[bool] = None
    payment_status: Optional[str] = None

    model_config = {"populate_by_name": True}


class TransactionResponse(TransactionBase):
    """Model for transaction response with all fields."""
    id: int
    uuid: Optional[UUID] = None
    created_at: datetime
    raw_message_id: Optional[int] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class GeminiParsedTransaction(BaseModel):
    """Model for Gemini AI parsed transaction data."""
    amount: Decimal
    description: str
    category: str
    transaction_type: TransactionType = Field(default=TransactionType.GASTO, alias="type")
    transaction_date: Optional[date_type] = Field(None, alias="date")
    tag: Optional[ProjectTag] = None
    account_source: Optional[str] = "Efectivo"
    is_recurring: bool = False
    
    # For corrections
    is_correction: bool = False
    correction_field: Optional[str] = None
    correction_value: Optional[str] = None

    model_config = {"populate_by_name": True}


class TransactionSummary(BaseModel):
    """Model for transaction summary/statistics."""
    total_income: Decimal = Decimal("0")
    total_expenses: Decimal = Decimal("0")
    total_investments: Decimal = Decimal("0")
    net_balance: Decimal = Decimal("0")
    transaction_count: int = 0
    
    by_tag: dict[str, Decimal] = Field(default_factory=dict)
    by_category: dict[str, Decimal] = Field(default_factory=dict)
