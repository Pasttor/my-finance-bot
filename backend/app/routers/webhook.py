"""
WhatsApp Webhook Router.
Handles incoming messages from Twilio WhatsApp API.
"""
from typing import Optional

from fastapi import APIRouter, Form, Header, Request, Response

from app.models.transaction import TransactionCreate, TransactionUpdate
from app.services.supabase_service import get_supabase_service
from app.services.gemini_service import get_gemini_service
from app.services.twilio_service import get_twilio_service


router = APIRouter()


@router.post("/webhook/whatsapp")
async def receive_whatsapp_message(
    request: Request,
    Body: str = Form(default=""),
    From: str = Form(...),
    To: str = Form(default=""),
    NumMedia: str = Form(default="0"),
    MediaUrl0: Optional[str] = Form(default=None),
    MediaContentType0: Optional[str] = Form(default=None),
    x_twilio_signature: Optional[str] = Header(default=None, alias="X-Twilio-Signature"),
):
    """
    Receive and process incoming WhatsApp messages from Twilio.
    
    Handles:
    - Text messages: Parse as expense/income instructions
    - Image messages: OCR receipt extraction
    - Correction requests: Update previous transactions
    """
    supabase = get_supabase_service()
    gemini = get_gemini_service()
    twilio = get_twilio_service()
    
    # Extract phone number (remove whatsapp: prefix)
    phone = From.replace("whatsapp:", "")
    
    # Save the incoming message
    media_url = MediaUrl0 if int(NumMedia) > 0 else None
    message_record = await supabase.save_whatsapp_message(
        sender=phone,
        message_text=Body if Body else None,
        media_url=media_url,
    )
    message_id = message_record["id"] if message_record else None
    
    try:
        # Check if this is an image message
        if int(NumMedia) > 0 and MediaUrl0 and MediaContentType0:
            if "image" in MediaContentType0:
                response_text = await _process_image_message(
                    phone=phone,
                    media_url=MediaUrl0,
                    caption=Body,
                    message_id=message_id,
                )
            else:
                response_text = "❌ Solo puedo procesar imágenes. Envía una foto de tu ticket."
        
        # Check if this is a correction request
        elif Body and await gemini.is_correction_request(Body):
            response_text = await _process_correction(
                phone=phone,
                message=Body,
            )
        
        # Process as a regular text transaction
        elif Body:
            response_text = await _process_text_message(
                phone=phone,
                message=Body,
                message_id=message_id,
            )
        
        else:
            response_text = "👋 ¡Hola! Envíame un gasto como: 'Gasté 150 en Uber #Personal' o una foto de tu ticket."
        
        # Mark message as processed
        if message_id:
            await supabase.mark_message_processed(message_id)
        
    except Exception as e:
        import traceback
        print(f"Error processing WhatsApp message: {e}")
        traceback.print_exc()
        response_text = twilio.format_error_message("general")
    
    # Return TwiML response
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{response_text}</Message>
</Response>"""
    
    return Response(content=twiml, media_type="application/xml")


async def _process_text_message(
    phone: str,
    message: str,
    message_id: Optional[int] = None,
) -> str:
    """Process a text message and create/update/delete a transaction."""
    supabase = get_supabase_service()
    gemini = get_gemini_service()
    twilio = get_twilio_service()
    
    # Parse the message with Gemini
    parsed = await gemini.parse_text_transaction(message)
    
    # Dispatch based on operation
    if parsed.operation == "delete":
        return await _process_delete_request(parsed)
        
    if parsed.operation == "update":
        return await _process_update_request(parsed)
    
    # Default: Create
    if parsed.amount <= 0:
        return twilio.format_error_message("parse")
    
    # Create the transaction
    transaction = TransactionCreate(
        amount=parsed.amount,
        description=parsed.description,
        category=parsed.category,
        type=parsed.transaction_type,
        date=parsed.transaction_date,
        tag=parsed.tag,
        account_source=parsed.account_source,
        is_recurring=parsed.is_recurring,
        raw_message_id=message_id,
    )
    
    result = await supabase.create_transaction(transaction)
    
    if result:
        # Save context for potential corrections
        await supabase.save_context(phone, result["id"], message)
        
        return twilio.format_transaction_confirmation(
            amount=float(parsed.amount),
            description=parsed.description,
            category=parsed.category,
            tag=parsed.tag.value if parsed.tag else None,
        )
    
    return twilio.format_error_message("general")


async def _process_delete_request(parsed) -> str:
    """Handle request to delete a transaction."""
    supabase = get_supabase_service()
    
    if not parsed.search_term:
        return "❌ Para eliminar necesito que me digas qué buscar (ej: 'borra el Uber')."
        
    # Search for the transaction
    matches = await supabase.search_transaction(
        search_term=parsed.search_term,
        date_filter=parsed.transaction_date  # Only if explicitly mentioned
    )
    
    if not matches:
        return f"🔍 No encontré ninguna transacción que coincida con '{parsed.search_term}'."
        
    # Delete the most recent match
    target = matches[0]
    await supabase.delete_transaction(target["id"])
    
    amount = float(target.get("amount", 0))
    desc = target.get("description", "Sin descripción")
    date_str = target.get("date", "")
    
    return f"🗑️ Eliminado: {desc} (${amount:,.2f}) del {date_str}."


async def _process_update_request(parsed) -> str:
    """Handle request to update a specific transaction."""
    supabase = get_supabase_service()
    
    if not parsed.search_term:
        return "❌ Para corregir necesito que me digas qué buscar (ej: 'cambia el Uber')."
        
    # Search for the transaction
    matches = await supabase.search_transaction(
        search_term=parsed.search_term,
        date_filter=parsed.transaction_date
    )
    
    if not matches:
        return f"🔍 No encontré ninguna transacción que coincida con '{parsed.search_term}'."
        
    target = matches[0]
    update_data = {}
    
    # Map correction fields
    field = parsed.correction_field
    value = parsed.correction_value
    
    if not field or not value:
        return "❌ No entendí qué quieres cambiar. Intenta: 'Cambia el monto a 500'."
        
    if field in ["amount", "monto", "precio", "valor"]:
        try:
            update_data["amount"] = float(value)
        except:
            return "❌ El nuevo monto debe ser un número."
            
    elif field in ["description", "descripción", "concepto", "nombre"]:
        update_data["description"] = value
        
    elif field in ["category", "categoría", "rubro"]:
        update_data["category"] = value
        
    elif field in ["date", "fecha", "día"]:
        # Gemini usually returns ISO date in correction_value if it's a date
        update_data["date"] = value
        
    if not update_data:
        return f"❌ No sé cómo actualizar el campo '{field}'."
        
    # Perform update
    # We use raw update because we have a dict
    updated = await supabase.update_transaction_raw(target["id"], update_data)
    
    if updated:
        return f"✅ Actualizado: {updated.get('description')} - ${float(updated.get('amount', 0)):,.2f} ({updated.get('date')})."
    
    return "❌ Hubo un error al actualizar la transacción."


async def _process_image_message(
    phone: str,
    media_url: str,
    caption: Optional[str] = None,
    message_id: Optional[int] = None,
) -> str:
    """Process an image message (receipt OCR)."""
    supabase = get_supabase_service()
    gemini = get_gemini_service()
    twilio = get_twilio_service()
    
    try:
        # Download the image
        image_bytes = await twilio.download_media(media_url)
        
        # Extract tag from caption if present
        tag = None
        if caption:
            tag = gemini._extract_tag_from_message(caption)
        
        # Process the receipt
        parsed = await gemini.process_receipt_to_transaction(image_bytes, tag)
        
        # Create the transaction
        transaction = TransactionCreate(
            amount=parsed.amount,
            description=parsed.description,
            category=parsed.category,
            type=parsed.transaction_type,
            date=parsed.transaction_date,
            tag=parsed.tag,
            account_source=parsed.account_source,
            is_recurring=False,
            raw_message_id=message_id,
        )
        
        result = await supabase.create_transaction(transaction)
        
        if result:
            # Save context for potential corrections
            await supabase.save_context(phone, result["id"], f"[RECEIPT] {parsed.description}")
            
            return twilio.format_transaction_confirmation(
                amount=float(parsed.amount),
                description=parsed.description,
                category=parsed.category,
                tag=parsed.tag.value if parsed.tag else None,
            )
        
        return twilio.format_error_message("general")
        
    except Exception as e:
        print(f"Error processing receipt: {e}")
        return twilio.format_error_message("receipt")


async def _process_correction(
    phone: str,
    message: str,
) -> str:
    """Process a correction request for the last transaction."""
    supabase = get_supabase_service()
    gemini = get_gemini_service()
    twilio = get_twilio_service()
    
    # Get the last transaction for this phone
    last_tx = await supabase.get_last_transaction(phone)
    
    if not last_tx:
        return twilio.format_error_message("correction")
    
    # Parse the correction request
    parsed = await gemini.parse_text_transaction(message)
    
    if not parsed.is_correction:
        # Fallback: try to extract a number for amount correction
        import re
        amount_match = re.search(r"(\d+(?:\.\d{2})?)", message)
        if amount_match:
            new_amount = float(amount_match.group(1))
            old_amount = float(last_tx.get("amount", 0))
            
            # Update the transaction
            update = TransactionUpdate(amount=new_amount)
            await supabase.update_transaction(last_tx["id"], update)
            
            return twilio.format_correction_confirmation(
                old_value=f"${old_amount:,.2f}",
                new_value=f"${new_amount:,.2f}",
                field="monto",
            )
    else:
        # Handle structured correction
        field = parsed.correction_field or "amount"
        new_value = parsed.correction_value
        
        if field == "amount" and new_value:
            old_amount = float(last_tx.get("amount", 0))
            update = TransactionUpdate(amount=float(new_value))
            await supabase.update_transaction(last_tx["id"], update)
            
            return twilio.format_correction_confirmation(
                old_value=f"${old_amount:,.2f}",
                new_value=f"${float(new_value):,.2f}",
                field="monto",
            )
    
    return twilio.format_error_message("correction")


@router.get("/webhook/whatsapp/test")
async def test_webhook():
    """Test endpoint to verify webhook is accessible."""
    return {"status": "ok", "message": "WhatsApp webhook is ready"}
