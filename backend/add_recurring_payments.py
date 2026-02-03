"""
Add recurring fixed payments to the database.
This script creates recurring transactions for regular bills and expenses.
"""
import httpx
import asyncio
from datetime import date

BASE_URL = "http://localhost:8000/api"

# Payments to add
RECURRING_PAYMENTS = [
    {
        "description": "Tarjeta Mi",
        "amount": 100.00,
        "category": "Tarjetas",
        "type": "gasto",
        "date": "2026-01-29",
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Banco"
    },
    {
        "description": "Izzi Internet",
        "amount": 450.00,
        "category": "Servicios",
        "type": "suscripcion",
        "date": "2026-01-24",
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Banco"
    },
    {
        "description": "Bait",
        "amount": 200.00,
        "category": "Servicios",
        "type": "gasto",
        "date": "2026-01-20",
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Banco"
    },
    {
        "description": "Meli+",
        "amount": 99.00,
        "category": "Suscripciones",
        "type": "suscripcion",
        "date": "2026-01-27",
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Tarjeta"
    },
    {
        "description": "Gasto Semanal (Lunes)",
        "amount": 700.00,
        "category": "Gastos Recurrentes",
        "type": "gasto",
        "date": "2026-01-27",  # Next Monday
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Efectivo"
    },
    {
        "description": "Pago Monitor (4 de 6)",
        "amount": 380.50,
        "category": "Pagos a Plazos",
        "type": "gasto",
        "date": "2026-02-16",
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Banco"
    }
]


async def add_recurring_payments():
    """Add all recurring payments to the database."""
    async with httpx.AsyncClient() as client:
        for payment in RECURRING_PAYMENTS:
            try:
                response = await client.post(
                    f"{BASE_URL}/transactions",
                    json=payment
                )
                
                if response.status_code == 201:
                    result = response.json()
                    print(f"✅ Added: {payment['description']} - ${payment['amount']}")
                else:
                    print(f"❌ Failed to add {payment['description']}: {response.text}")
                    
            except Exception as e:
                print(f"❌ Error adding {payment['description']}: {e}")


if __name__ == "__main__":
    print("Adding recurring fixed payments...")
    print("=" * 50)
    asyncio.run(add_recurring_payments())
    print("=" * 50)
    print("✅ Done!")
