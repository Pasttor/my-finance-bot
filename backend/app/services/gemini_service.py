"""
Gemini AI Service for text parsing and OCR.
Uses Google's Gemini API for intelligent transaction extraction from text and images.
"""
import json
import re
from datetime import date
from decimal import Decimal
from functools import lru_cache
from typing import Optional

import google.generativeai as genai
from PIL import Image
import io

from app.config import get_settings
from app.models.transaction import GeminiParsedTransaction, TransactionType, ProjectTag


# System prompts for Gemini
TEXT_PARSING_PROMPT = """Eres un asistente financiero experto. Tu tarea es analizar mensajes de usuarios y extraer la intención (CREAR, BORRAR, ACTUALIZAR) y los datos estructurados.

TIPO DE OPERACIÓN ("operation"):
1. "create": Nuevo gasto/ingreso (ej: "Gasté 500 en Uber", "Cobré 2000").
2. "delete": Eliminar algo (ej: "Borra el Uber de ayer", "Elimina el gasto de 500", "Quita la suscripción de Netflix").
3. "update": Corregir algo ESPECÍFICO (ej: "El gasto de Uber no era 500, era 600", "Cambia la fecha de Walmart a ayer").

REGLAS PARA "create":
- Extrae amount, description, category, type, date, tag, account_source.
- Si no hay fecha, usa la de hoy.

REGLAS PARA "delete" / "update":
- Extrae "search_term" para encontrar la transacción (ej: "Uber", "Netflix", "500").
- Extrae "date" si se menciona una fecha específica para la búsqueda (ej: "de ayer").
- Para "update", extrae "correction_field" (amount, description, date, category) y "correction_value".

FORMATO DE SALIDA (JSON estricto):
{
  "operation": "create|delete|update",
  "amount": número (para create) o 0,
  "description": "descripción" (para create) o "",
  "category": "categoría" (para create) o "Otros",
  "type": "gasto|ingreso|inversion|suscripcion",
  "payment_status": "pagado|pendiente",
  "date": "YYYY-MM-DD" o null,
  "tag": "#Asces|#LabCasa|#Personal" o null,
  "account_source": "Efectivo|Tarjeta...",
  "is_recurring": true/false,
  "search_term": "término de búsqueda" o null,
  "correction_field": "campo a corregir" o null,
  "correction_value": "nuevo valor" o null
}

Responde SOLO con el JSON."""

RECEIPT_OCR_PROMPT = """Analiza esta imagen de un ticket o recibo de compra. Extrae la siguiente información:

1. Nombre del comercio/tienda
2. Monto TOTAL de la compra (busca "TOTAL", "IMPORTE", "A PAGAR")
3. Fecha del ticket (si es visible)
4. Principales artículos comprados (máximo 3)

FORMATO DE SALIDA (JSON estricto):
{
  "merchant": "nombre del comercio",
  "amount": número del total sin símbolos,
  "date": "YYYY-MM-DD" o null,
  "items": ["artículo 1", "artículo 2"],
  "confidence": "alta|media|baja"
}

Si no puedes leer el ticket claramente, indica confidence: "baja".
Responde SOLO con el JSON, sin texto adicional ni markdown."""


class GeminiService:
    """Service class for Gemini AI operations."""
    
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.text_model = genai.GenerativeModel("gemini-3-flash-preview")
        self.vision_model = genai.GenerativeModel("gemini-3-flash-preview")
        self.today = date.today().isoformat()
    
    def _clean_json_response(self, response_text: str) -> str:
        """Clean Gemini response to extract valid JSON."""
        # Remove markdown code blocks if present
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
    
    def _extract_tag_from_message(self, message: str) -> Optional[str]:
        """Extract project tag from message using regex."""
        tag_pattern = r"(#Asces|#LabCasa|#Personal)"
        match = re.search(tag_pattern, message, re.IGNORECASE)
        if match:
            tag = match.group(1)
            # Normalize tag
            tag_map = {
                "#asces": "#Asces",
                "#labcasa": "#LabCasa",
                "#personal": "#Personal",
            }
            return tag_map.get(tag.lower(), tag)
        return None
    
    async def parse_text_transaction(self, message: str) -> GeminiParsedTransaction:
        """Parse a text message to extract transaction data."""
        # Add context about current date
        prompt = f"{TEXT_PARSING_PROMPT}\n\nFecha de hoy: {self.today}\n\nMensaje del usuario:\n{message}"
        
        try:
            response = self.text_model.generate_content(prompt)
            response_text = self._clean_json_response(response.text)
            
            data = json.loads(response_text)
            
            # Ensure tag is extracted if present in original message
            if not data.get("tag"):
                data["tag"] = self._extract_tag_from_message(message)
            
            # Set today's date if not provided, BUT only for 'create' operation
            # For delete/update, we want to allow searching without a date filter
            if not data.get("date") and data.get("operation") == "create":
                data["date"] = self.today
            
            # Validate and convert type
            tx_type = data.get("type", "gasto").lower()
            if tx_type not in ["ingreso", "gasto", "inversion", "suscripcion"]:
                tx_type = "gasto"
            data["type"] = tx_type
            
            return GeminiParsedTransaction(**data)
            
        except json.JSONDecodeError as e:
            # Fallback: try to extract basic info
            return self._fallback_parse(message)
        except Exception as e:
            print(f"Error parsing transaction: {e}")
            return self._fallback_parse(message)
    
    def _fallback_parse(self, message: str) -> GeminiParsedTransaction:
        """Fallback parsing when Gemini fails."""
        # Try to extract amount using regex
        amount_pattern = r"\$?(\d+(?:,\d{3})*(?:\.\d{2})?)"
        amount_match = re.search(amount_pattern, message)
        amount = Decimal(amount_match.group(1).replace(",", "")) if amount_match else Decimal("0")
        
        # Extract tag
        tag = self._extract_tag_from_message(message)
        
        # Detect transaction type based on keywords
        message_lower = message.lower()
        income_keywords = ["ingreso", "ingresos", "cobré", "cobre", "recibí", "recibi", 
                          "me pagaron", "pagaron", "sueldo", "salario", "venta", "vendí"]
        expense_keywords = ["gasté", "gaste", "pagué", "pague", "compré", "compre", 
                           "gasto", "compra", "cuenta"]
        
        tx_type = TransactionType.GASTO  # Default
        if any(kw in message_lower for kw in income_keywords):
            tx_type = TransactionType.INGRESO
        elif any(kw in message_lower for kw in expense_keywords):
            tx_type = TransactionType.GASTO
            
        # Freelance/Income Heuristic: "Pago pendiente de..." usually means income for a freelancer
        # if it involves "cliente", "proyecto", "web", "app", "logo", "design"
        freelance_keywords = ["cliente", "proyecto", "web", "app", "logo", "design", "anticipo", "resto"]
        if "pendiente" in message_lower and any(kw in message_lower for kw in freelance_keywords):
             tx_type = TransactionType.INGRESO
            
        # Detect payment status
        pending_keywords = ["pendiente", "debo", "pagar luego", "fiado", "crédito", "por cobrar"]
        payment_status = "pendiente" if any(kw in message_lower for kw in pending_keywords) else "pagado"
        
        return GeminiParsedTransaction(
            amount=amount,
            description=message[:100],
            category="Otros",
            transaction_type=tx_type,
            transaction_date=date.today(),
            tag=ProjectTag(tag) if tag else None,
            account_source="Efectivo",
            is_recurring=False,
            payment_status=payment_status,
        )
    
    async def extract_receipt_data(self, image_bytes: bytes) -> dict:
        """Extract transaction data from a receipt image using OCR."""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            response = self.vision_model.generate_content([
                RECEIPT_OCR_PROMPT,
                image
            ])
            
            response_text = self._clean_json_response(response.text)
            data = json.loads(response_text)
            
            return {
                "success": True,
                "merchant": data.get("merchant", "Comercio desconocido"),
                "amount": Decimal(str(data.get("amount", 0))),
                "date": data.get("date") or self.today,
                "items": data.get("items", []),
                "confidence": data.get("confidence", "media"),
            }
            
        except Exception as e:
            print(f"Error extracting receipt data: {e}")
            return {
                "success": False,
                "error": str(e),
                "merchant": None,
                "amount": None,
                "date": None,
            }
    
    async def process_receipt_to_transaction(
        self,
        image_bytes: bytes,
        tag: Optional[str] = None,
    ) -> GeminiParsedTransaction:
        """Process a receipt image and return a transaction object."""
        receipt_data = await self.extract_receipt_data(image_bytes)
        
        if not receipt_data["success"]:
            raise ValueError(f"Could not process receipt: {receipt_data.get('error')}")
        
        # Build description from merchant and items
        items_str = ", ".join(receipt_data.get("items", [])[:3])
        description = f"{receipt_data['merchant']}"
        if items_str:
            description += f" - {items_str}"
        
        # Determine category based on merchant name
        category = self._guess_category_from_merchant(receipt_data["merchant"])
        
        return GeminiParsedTransaction(
            amount=receipt_data["amount"],
            description=description[:200],
            category=category,
            transaction_type=TransactionType.GASTO,
            transaction_date=date.fromisoformat(receipt_data["date"]) if receipt_data["date"] else date.today(),
            tag=ProjectTag(tag) if tag else None,
            account_source="Tarjeta",  # Most receipt purchases are card-based
            is_recurring=False,
        )
    
    def _guess_category_from_merchant(self, merchant: str) -> str:
        """Guess category based on merchant name."""
        merchant_lower = merchant.lower()
        
        category_keywords = {
            "Alimentación": ["oxxo", "7-eleven", "walmart", "costco", "soriana", "chedraui", 
                            "restaurante", "tacos", "pizza", "café", "coffee", "starbucks",
                            "mcdonald", "burger", "sushi", "comida"],
            "Transporte": ["uber", "didi", "cabify", "gasolinera", "pemex", "estacionamiento",
                          "parking", "taxi", "bus"],
            "Entretenimiento": ["cine", "cinepolis", "cinemex", "netflix", "spotify", 
                               "steam", "playstation", "xbox", "teatro", "concierto"],
            "Servicios": ["telmex", "telcel", "cfe", "luz", "agua", "gas", "internet"],
            "Compras": ["amazon", "mercadolibre", "liverpool", "sears", "palacio", "zara",
                       "h&m", "nike", "adidas"],
            "Salud": ["farmacia", "guadalajara", "benavides", "san pablo", "doctor", 
                     "hospital", "consultorio", "laboratorio"],
            "Hogar": ["home depot", "sodimac", "office depot", "ferretería", "muebles"],
        }
        
        for category, keywords in category_keywords.items():
            if any(kw in merchant_lower for kw in keywords):
                return category
        
        return "Compras"  # Default category for receipts
    
    async def is_correction_request(self, message: str) -> bool:
        """Check if a message is a correction request."""
        correction_keywords = [
            "cambia", "cámbialo", "corrige", "corrígelo", "no fue", "no era",
            "mal", "error", "equivocado", "incorrecto", "sino", "eran",
            "ponlo", "debería ser", "actualiza", "modifica"
        ]
        message_lower = message.lower()
        return any(kw in message_lower for kw in correction_keywords)


@lru_cache
def get_gemini_service() -> GeminiService:
    """Get cached Gemini service instance."""
    settings = get_settings()
    return GeminiService(settings.GEMINI_API_KEY)
