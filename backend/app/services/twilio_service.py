"""
Twilio Service for WhatsApp messaging.
Handles sending and receiving WhatsApp messages via Twilio API.
"""
from functools import lru_cache
from typing import Optional

import httpx
from twilio.rest import Client
from twilio.request_validator import RequestValidator

from app.config import get_settings


class TwilioService:
    """Service class for Twilio WhatsApp operations."""
    
    def __init__(self, account_sid: str, auth_token: str, phone_number: str):
        self.client = Client(account_sid, auth_token)
        self.phone_number = phone_number
        self.auth_token = auth_token
        self.validator = RequestValidator(auth_token)
    
    def validate_request(self, url: str, params: dict, signature: str) -> bool:
        """Validate that a request came from Twilio."""
        return self.validator.validate(url, params, signature)
    
    async def send_message(self, to: str, body: str) -> dict:
        """Send a WhatsApp message."""
        # Ensure the 'to' number has the whatsapp: prefix
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"
        
        message = self.client.messages.create(
            body=body,
            from_=self.phone_number,
            to=to,
        )
        
        return {
            "sid": message.sid,
            "status": message.status,
            "to": message.to,
        }
    
    async def download_media(self, media_url: str) -> bytes:
        """Download media from a Twilio media URL."""
        settings = get_settings()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                media_url,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                follow_redirects=True,
            )
            response.raise_for_status()
            return response.content
    
    def format_transaction_confirmation(
        self,
        amount: float,
        description: str,
        category: str,
        tag: Optional[str] = None,
    ) -> str:
        """Format a transaction confirmation message."""
        tag_str = f" {tag}" if tag else ""
        return f"✅ Registrado:\n💰 ${amount:,.2f}\n📝 {description}\n📁 {category}{tag_str}"
    
    def format_correction_confirmation(
        self,
        old_value: str,
        new_value: str,
        field: str = "monto",
    ) -> str:
        """Format a correction confirmation message."""
        return f"✅ Corregido:\n{field.title()}: {old_value} → {new_value}"
    
    def format_error_message(self, error_type: str = "general") -> str:
        """Format an error message for the user."""
        messages = {
            "general": "❌ Hubo un error procesando tu mensaje. Por favor intenta de nuevo.",
            "parse": "❌ No pude entender tu mensaje. Intenta con algo como: 'Gasté 150 en Uber #Personal'",
            "receipt": "❌ No pude leer el ticket. Intenta tomar una foto más clara.",
            "correction": "❌ No encontré una transacción reciente para corregir.",
        }
        return messages.get(error_type, messages["general"])
    
    def format_reminder(
        self,
        concept: str,
        amount: float,
        days_until: int,
    ) -> str:
        """Format a due date reminder message."""
        if days_until > 0:
            return f"⏰ Recordatorio: {concept} vence en {days_until} día(s)\n💰 ${amount:,.2f}"
        elif days_until == 0:
            return f"🔔 ¡HOY vence {concept}!\n💰 ${amount:,.2f}"
        else:
            return f"⚠️ VENCIDO: {concept} venció hace {abs(days_until)} día(s)\n💰 ${amount:,.2f}"
    
    def format_summary(
        self,
        total_income: float,
        total_expenses: float,
        net_balance: float,
        period: str = "este mes",
    ) -> str:
        """Format a financial summary message."""
        emoji = "📈" if net_balance >= 0 else "📉"
        return (
            f"📊 Resumen {period}:\n"
            f"💚 Ingresos: ${total_income:,.2f}\n"
            f"❤️ Gastos: ${total_expenses:,.2f}\n"
            f"{emoji} Balance: ${net_balance:,.2f}"
        )


@lru_cache
def get_twilio_service() -> TwilioService:
    """Get cached Twilio service instance."""
    settings = get_settings()
    return TwilioService(
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_PHONE_NUMBER,
    )
