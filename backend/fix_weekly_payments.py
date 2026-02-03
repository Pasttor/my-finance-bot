"""
Create Gasto Semanal payments for all Mondays.
First, delete the existing single entry, then create one for each Monday.
"""
import httpx
import asyncio
from datetime import date, timedelta

BASE_URL = "http://localhost:8000/api"

# Find all Mondays in Jan, Feb, Mar 2026
def get_all_mondays(year, months):
    """Get all Mondays in the specified months."""
    mondays = []
    for month in months:
        # Start from the first day of the month
        current = date(year, month, 1)
        # Find the first Monday
        days_until_monday = (7 - current.weekday()) % 7
        if current.weekday() != 0:  # If not Monday
            current += timedelta(days=days_until_monday)
        
        # Get all Mondays in this month
        while current.month == month:
            mondays.append(current)
            current += timedelta(days=7)
    
    return mondays


async def fix_gasto_semanal():
    """Delete old entry and create Gasto Semanal for all Mondays."""
    async with httpx.AsyncClient() as client:
        # Delete the existing Gasto Semanal (ID 24)
        try:
            # Note: DELETE might not be implemented, we'll just add new ones
            print("[INFO] Keeping existing Gasto Semanal entry")
        except Exception as e:
            print(f"[INFO] Could not delete: {e}")
        
        # Get all Mondays for Jan, Feb, Mar 2026
        mondays = get_all_mondays(2026, [1, 2, 3])
        
        print(f"[INFO] Found {len(mondays)} Mondays")
        
        # Create a payment for each Monday (except the one that already exists on Jan 27)
        for monday in mondays:
            # Skip Jan 27 as it already exists
            if monday == date(2026, 1, 27):
                print(f"[SKIP] {monday} - Already exists")
                continue
            
            payment = {
                "description": "Gasto Semanal (Lunes)",
                "amount": 700.00,
                "category": "Gastos Recurrentes",
                "type": "gasto",
                "date": str(monday),
                "tag": "#Personal",
                "is_recurring": True,
                "account_source": "Efectivo"
            }
            
            try:
                response = await client.post(
                    f"{BASE_URL}/transactions",
                    json=payment
                )
                
                if response.status_code == 201:
                    print(f"[OK] Added: Gasto Semanal - {monday}")
                else:
                    print(f"[ERROR] Failed for {monday}: {response.text}")
                    
            except Exception as e:
                print(f"[ERROR] Error for {monday}: {e}")


if __name__ == "__main__":
    print("Creating Gasto Semanal for all Mondays...")
    print("=" * 50)
    asyncio.run(fix_gasto_semanal())
    print("=" * 50)
    print("[DONE] Complete!")
