"""
Supabase Service for database operations.
Uses PostgREST client for lightweight Supabase integration.
"""
from datetime import date, datetime
from decimal import Decimal
from functools import lru_cache
from typing import Optional
import httpx

from app.config import get_settings


class SupabaseService:
    """Service class for Supabase database operations using REST API."""
    
    def __init__(self, url: str, key: str):
        self.base_url = f"{url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self.client = httpx.Client(headers=self.headers, timeout=30.0)
    
    def _request(self, method: str, endpoint: str, **kwargs) -> dict | list | None:
        """Make HTTP request to Supabase REST API using urllib standard library."""
        import urllib.request
        import json
        
        url = f"{self.base_url}/{endpoint}"
        
        try:
            data = None
            if 'json' in kwargs:
                data = json.dumps(kwargs['json']).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, method=method)
            
            for k, v in self.headers.items():
                req.add_header(k, v)
                
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_data = response.read()
                if resp_data:
                    return json.loads(resp_data.decode('utf-8'))
                return None
        except Exception as e:
            import sys
            print(f"Error in _request ({method} {endpoint}): {e}", file=sys.stderr)
            # Re-raise to let caller handle or inspect
            # If it's an HTTP error, we might want to know details
            if hasattr(e, 'read'):
               try:
                   print(f"Error body: {e.read().decode('utf-8')}", file=sys.stderr)
               except: pass
            raise e
    
    def rpc(self, function_name: str, params: dict) -> dict | list | None:
        """Call a Postgres function (RPC)."""
        return self._request("POST", f"rpc/{function_name}", json=params)
    
    # ==================== TRANSACTIONS ====================
    
    async def create_transaction(self, transaction) -> dict:
        """Create a new transaction and return the created record."""
        data = transaction.model_dump(mode="json", by_alias=True, exclude_none=True)
        if data.get("date"):
            data["date"] = str(data["date"])
        if data.get("tag"):
            data["tag"] = data["tag"].value if hasattr(data["tag"], "value") else data["tag"]
        if data.get("type"):
            data["type"] = data["type"].value if hasattr(data["type"], "value") else data["type"]
        
        # Remove fields not in the database table
        data.pop("raw_message_id", None)
        
        result = self._request("POST", "transactions", json=data)
        return result[0] if result else None
    
    async def update_transaction(self, transaction_id: int, updates):
        """Update an existing transaction by ID."""
        update_dict = updates.model_dump(exclude_unset=True, exclude_none=True, mode="json")
        print(f"[DEBUG SERVICE] Raw update_dict: {update_dict}")
        
        # Handle date conversion if present
        if "transaction_date" in update_dict:
            update_dict["date"] = str(update_dict.pop("transaction_date"))
        if "transaction_type" in update_dict:
            update_dict["type"] = update_dict.pop("transaction_type")
        
        print(f"[DEBUG SERVICE] Final update_dict: {update_dict}")
        
        if not update_dict:
            print("[DEBUG SERVICE] Empty update_dict, returning None")
            return None
        
        try:
            response = self._request(
                "PATCH",
                f"transactions?id=eq.{transaction_id}",
                json=update_dict
            )
            print(f"[DEBUG SERVICE] PATCH Response: {response}")
            
            # If response is empty but PATCH succeeded, fetch the updated record
            if response:
                return response[0]
            else:
                # Fetch the updated record
                updated = self._request("GET", f"transactions?id=eq.{transaction_id}")
                print(f"[DEBUG SERVICE] GET after PATCH: {updated}")
                return updated[0] if updated else None
        except Exception as e:
            print(f"[DEBUG SERVICE] Error: {e}")
            raise

    async def update_transaction_raw(self, transaction_id: int, update_dict: dict):
        """Update an existing transaction with a raw dict."""
        import sys
        print(f"[DEBUG SERVICE RAW] Updating {transaction_id} with: {update_dict}", file=sys.stderr)
        
        if not update_dict:
            return None
        
        try:
            response = self._request(
                "PATCH",
                f"transactions?id=eq.{transaction_id}",
                json=update_dict
            )
            print(f"[DEBUG SERVICE RAW] PATCH Response: {response}", file=sys.stderr)
            
            if response:
                return response[0]
            else:
                updated = self._request("GET", f"transactions?id=eq.{transaction_id}")
                return updated[0] if updated else None
        except Exception as e:
            print(f"[DEBUG SERVICE RAW] Error: {e}", file=sys.stderr)
            raise

    async def search_transaction(self, search_term: str, date_filter: Optional[date] = None) -> list[dict]:
        """Search for a transaction by description or amount."""
        from urllib.parse import quote
        import unicodedata
        import sys

        def normalize_text(text: str) -> str:
            return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")

        print(f"[DEBUG] Searching for '{search_term}' (Date: {date_filter})", file=sys.stderr)

        # Helper to execute search
        def build_query(term):
            filters = []
            is_amount = False
            try:
                float(term)
                is_amount = True
            except ValueError:
                pass
                
            if is_amount:
                filters.append(f"amount=eq.{term}")
            else:
                encoded_term = quote(term)
                filters.append(f"description=ilike.*{encoded_term}*")
                
            if date_filter:
                filters.append(f"date=eq.{date_filter}")
            
            return "&".join(filters)

        # 1. Try original search
        query = build_query(search_term)
        # Order by date descending (primary) then created_at (secondary)
        endpoint = f"transactions?{query}&order=date.desc,created_at.desc&limit=5"
        print(f"[DEBUG] Query 1: {endpoint}", file=sys.stderr)
        
        results = self._request("GET", endpoint)
        
        # 2. If empty and term has accents, try normalized search
        if not results:
            normalized = normalize_text(search_term)
            if normalized != search_term:
                print(f"[DEBUG] Original search failed. Trying normalized: '{normalized}'", file=sys.stderr)
                query = build_query(normalized)
                endpoint = f"transactions?{query}&order=date.desc,created_at.desc&limit=5"
                results = self._request("GET", endpoint)

        return results or []

    async def delete_transaction(self, transaction_id: int):
        """Delete a transaction by ID."""
        self._request( # Changed from await self._request to self._request to match other methods
            "DELETE",
            f"transactions?id=eq.{transaction_id}"
        )
        return True
    
    async def get_transaction_by_id(self, transaction_id: int) -> Optional[dict]:
        """Get a transaction by its ID."""
        result = self._request("GET", f"transactions?id=eq.{transaction_id}")
        return result[0] if result else None
    
    async def get_transactions(
        self,
        limit: int = 50,
        offset: int = 0,
        tag: Optional[str] = None,
        category: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: Optional[str] = None,
    ) -> list[dict]:
        """Get transactions with optional filters."""
        filters = []
        if tag:
            filters.append(f"tag=eq.{tag}")
        if category:
            filters.append(f"category=eq.{category}")
        if start_date:
            filters.append(f"date=gte.{start_date}")
        if end_date:
            filters.append(f"date=lte.{end_date}")
        if transaction_type:
            filters.append(f"type=eq.{transaction_type}")
        
        query = "&".join(filters) if filters else ""
        # Order by date descending (primary) to show updated/effective dates first, then created_at (secondary)
        endpoint = f"transactions?{query}&order=date.desc,created_at.desc&limit={limit}&offset={offset}"
        
        return self._request("GET", endpoint) or []
    
    async def get_transactions_summary(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Get aggregated transaction summary."""
        filters = []
        if start_date:
            filters.append(f"date=gte.{start_date}")
        if end_date:
            filters.append(f"date=lte.{end_date}")
        
        query = "&".join(filters) if filters else ""
        endpoint = f"transactions?{query}" if query else "transactions"
        
        transactions = self._request("GET", endpoint) or []
        
        summary = {
            "total_income": Decimal("0"),
            "total_expenses": Decimal("0"),
            "total_investments": Decimal("0"),
            "transaction_count": len(transactions),
            "by_tag": {},
            "by_category": {},
        }
        
        for tx in transactions:
            amount = Decimal(str(tx.get("amount", 0)))
            tx_type = tx.get("type", "gasto")
            tag = tx.get("tag") or "Sin etiqueta"
            category = tx.get("category") or "Sin categoría"
            
            if tx_type == "ingreso":
                summary["total_income"] += amount
            elif tx_type == "inversion":
                summary["total_investments"] += amount
            else:
                summary["total_expenses"] += amount
            
            summary["by_tag"][tag] = summary["by_tag"].get(tag, Decimal("0")) + amount
            summary["by_category"][category] = summary["by_category"].get(category, Decimal("0")) + amount
        
        summary["net_balance"] = summary["total_income"] - summary["total_expenses"] - summary["total_investments"]
        
        # Convert Decimals to float for JSON
        for key in ["total_income", "total_expenses", "total_investments", "net_balance"]:
            summary[key] = float(summary[key])
        summary["by_tag"] = {k: float(v) for k, v in summary["by_tag"].items()}
        summary["by_category"] = {k: float(v) for k, v in summary["by_category"].items()}
        
        return summary
    
    # ==================== CONVERSATION CONTEXT ====================
    
    async def save_context(self, phone: str, transaction_id: int, message: str) -> dict:
        """Save or update conversation context for a phone number."""
        try:
            existing = self._request("GET", f"conversation_context?phone_number=eq.{phone}")
        except Exception:
            existing = None
        
        if existing and len(existing) > 0:
            context = existing[0]
            history = context.get("message_history", []) or []
            history.append({
                "message": message,
                "transaction_id": transaction_id,
                "timestamp": datetime.now().isoformat(),
            })
            history = history[-10:]
            
            try:
                result = self._request("PATCH", f"conversation_context?phone_number=eq.{phone}", json={
                    "last_transaction_id": transaction_id,
                    "message_history": history,
                })
                return result[0] if result else None
            except Exception as e:
                print(f"Error updating context: {e}")
                return None
        else:
            # Use upsert to avoid conflicts
            try:
                # Add Prefer header for upsert
                url = f"{self.base_url}/conversation_context"
                headers = {**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"}
                response = self.client.post(url, json={
                    "phone_number": phone,
                    "last_transaction_id": transaction_id,
                    "message_history": [{
                        "message": message,
                        "transaction_id": transaction_id,
                        "timestamp": datetime.now().isoformat(),
                    }],
                }, headers=headers)
                if response.status_code in [200, 201, 409]:
                    # 409 means it exists, which is fine
                    if response.text:
                        result = response.json()
                        return result[0] if result else None
                return None
            except Exception as e:
                print(f"Error creating context: {e}")
                return None
    
    async def get_last_transaction(self, phone: str) -> Optional[dict]:
        """Get the last transaction for a phone number."""
        context = self._request("GET", f"conversation_context?phone_number=eq.{phone}&select=last_transaction_id")
        
        if not context or not context[0].get("last_transaction_id"):
            return None
        
        tx_id = context[0]["last_transaction_id"]
        return await self.get_transaction_by_id(tx_id)
    
    # ==================== DUE DATES ====================
    
    async def get_due_dates(
        self,
        status: Optional[str] = None,
        tag: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[dict]:
        """Get due dates with optional filters."""
        filters = []
        if status:
            filters.append(f"status=eq.{status}")
        if tag:
            filters.append(f"tag=eq.{tag}")
        if start_date:
            filters.append(f"due_date=gte.{start_date}")
        if end_date:
            filters.append(f"due_date=lte.{end_date}")
        
        query = "&".join(filters) if filters else ""
        endpoint = f"due_dates?{query}&order=due_date.asc"
        
        return self._request("GET", endpoint) or []
    
    async def update_due_date_status(self, due_date_id: str, status: str) -> dict:
        """Update the status of a due date."""
        result = self._request("PATCH", f"due_dates?id=eq.{due_date_id}", json={"status": status})
        return result[0] if result else None
    
    # ==================== CATEGORIES ====================
    
    async def get_categories(self, active_only: bool = True) -> list[dict]:
        """Get all categories."""
        endpoint = "categories?is_active=eq.true&order=name" if active_only else "categories?order=name"
        return self._request("GET", endpoint) or []
    
    # ==================== SAVINGS GOALS ====================
    
    async def get_savings_goals(self, include_completed: bool = False) -> list[dict]:
        """Get savings goals."""
        endpoint = "savings_goals?order=created_at.desc"
        if not include_completed:
            endpoint = "savings_goals?is_completed=eq.false&order=created_at.desc"
        
        return self._request("GET", endpoint) or []
    
    # ==================== WHATSAPP MESSAGES ====================
    
    async def save_whatsapp_message(
        self,
        sender: str,
        message_text: Optional[str] = None,
        media_url: Optional[str] = None,
    ) -> dict:
        """Save an incoming WhatsApp message."""
        result = self._request("POST", "whatsapp_messages", json={
            "sender": sender,
            "message_text": message_text,
            "media_url": media_url,
            "is_processed": False,
        })
        return result[0] if result else None
    
    async def mark_message_processed(self, message_id: int) -> dict:
        """Mark a WhatsApp message as processed."""
        result = self._request("PATCH", f"whatsapp_messages?id=eq.{message_id}", json={
            "is_processed": True,
        })
        return result[0] if result else None


@lru_cache
def get_supabase_service() -> SupabaseService:
    """Get cached Supabase service instance."""
    settings = get_settings()
    return SupabaseService(settings.SUPABASE_URL, settings.SUPABASE_KEY)
