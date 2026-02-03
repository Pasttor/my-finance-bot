"""
Add new recurring fixed payments (Gym and WD).
"""
import httpx
import asyncio

BASE_URL = "http://localhost:8000/api"

# New payments to add
NEW_PAYMENTS = [
    {
        "description": "Gym",
        "amount": 365.00,
        "category": "Salud y Deporte",
        "type": "suscripcion",
        "date": "2026-01-29",
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Banco"
    },
    {
        "description": "WD",
        "amount": 700.00,
        "category": "Servicios",
        "type": "gasto",
        "date": "2026-02-01",  # Next February 1st
        "tag": "#Personal",
        "is_recurring": True,
        "account_source": "Banco"
    }
]


async def add_new_payments():
    """Add new recurring payments to the database."""
    async with httpx.AsyncClient() as client:
        for payment in NEW_PAYMENTS:
            try:
                response = await client.post(
                    f"{BASE_URL}/transactions",
                    json=payment
                )
                
                if response.status_code == 201:
                    result = response.json()
                    print(f"[OK] Added: {payment['description']} - ${payment['amount']}")
                else:
                    print(f"[ERROR] Failed to add {payment['description']}: {response.text}")
                    
            except Exception as e:
                print(f"[ERROR] Error adding {payment['description']}: {e}")


if __name__ == "__main__":
    print("Adding new recurring payments...")
    print("=" * 50)
    asyncio.run(add_new_payments())
    print("=" * 50)
    print("[DONE] Complete!")
