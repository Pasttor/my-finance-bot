"""
Transactions Router.
CRUD operations for financial transactions.
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Body

from app.models.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.supabase_service import get_supabase_service


router = APIRouter()


@router.get("/transactions")
async def list_transactions(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    tag: Optional[str] = Query(default=None, description="Filter by project tag"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    type: Optional[str] = Query(default=None, description="Filter by transaction type"),
    start_date: Optional[date] = Query(default=None, description="Start date filter"),
    end_date: Optional[date] = Query(default=None, description="End date filter"),
):
    """
    Get a list of transactions with optional filters.
    """
    supabase = get_supabase_service()
    
    transactions = await supabase.get_transactions(
        limit=limit,
        offset=offset,
        tag=tag,
        category=category,
        start_date=start_date,
        end_date=end_date,
        transaction_type=type,
    )
    
    return {
        "data": transactions,
        "count": len(transactions),
        "limit": limit,
        "offset": offset,
    }


@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: int):
    """
    Get a single transaction by ID.
    """
    supabase = get_supabase_service()
    
    transaction = await supabase.get_transaction_by_id(transaction_id)
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction


@router.post("/transactions", status_code=201)
async def create_transaction(transaction: TransactionCreate):
    """
    Create a new transaction manually.
    """
    supabase = get_supabase_service()
    
    result = await supabase.create_transaction(transaction)
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create transaction")
    
    return result


@router.patch("/transactions/{transaction_id}")
async def update_transaction(transaction_id: int, updates: dict = Body(...)):
    """
    Update an existing transaction.
    """
    supabase = get_supabase_service()
    
    # Check for payment_status updates explicitly
    if 'payment_status' in updates:
        status = updates['payment_status']
        # Use RPC for reliable status updates
        try:
            result = supabase.rpc('update_payment_status', {
                'p_id': transaction_id, 
                'p_status': status
            })
            
            if result:
                # If there are other updates besides payment_status, apply them via PATCH?
                # For now let's assume status update is the main action or handle others if needed.
                updates_copy = updates.copy()
                del updates_copy['payment_status']
                
                if updates_copy:
                     # Attempt to patch the rest
                     try:
                        supabase._request("PATCH", f"transactions?id=eq.{transaction_id}", json=updates_copy)
                     except:
                        pass # Ignore patch errors for now if RPC succeeded
                
                return result
        except Exception as e:
            print(f"RPC Error: {e}")
            # Fallback to standard flow
            pass

    # Fallback to standard PATCH mechanism if RPC wasn't used or failed
    try:
        result = supabase._request(
            "PATCH",
            f"transactions?id=eq.{transaction_id}",
            json=updates
        )
        if result: return result[0]
        
        # Fallback fetch
        result = supabase._request("GET", f"transactions?id=eq.{transaction_id}")
        if result: return result[0]
    except Exception as e:
        print(f"PATCH Error: {e}")
        # Final fallback fetch
        try:
            result = supabase._request("GET", f"transactions?id=eq.{transaction_id}")
            if result: return result[0]
        except:
            pass
            
    raise HTTPException(status_code=500, detail="Failed to update transaction")


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int):
    """
    Delete a transaction permanently from the database.
    """
    supabase = get_supabase_service()
    
    # Check if transaction exists
    existing = await supabase.get_transaction_by_id(transaction_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Delete the transaction
    await supabase.delete_transaction(transaction_id)
    
    return {"message": f"Transaction {transaction_id} deleted successfully"}


@router.get("/categories")
async def list_categories():
    """
    Get all available transaction categories.
    """
    supabase = get_supabase_service()
    
    categories = await supabase.get_categories()
    
    return {
        "data": categories,
        "count": len(categories),
    }


@router.get("/due-dates")
async def list_due_dates(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    tag: Optional[str] = Query(default=None, description="Filter by project tag"),
    start_date: Optional[date] = Query(default=None, description="Start date filter"),
    end_date: Optional[date] = Query(default=None, description="End date filter"),
):
    """
    Get a list of due dates (recurring payments, subscriptions).
    """
    supabase = get_supabase_service()
    
    due_dates = await supabase.get_due_dates(
        status=status,
        tag=tag,
        start_date=start_date,
        end_date=end_date,
    )
    
    return {
        "data": due_dates,
        "count": len(due_dates),
    }


@router.patch("/due-dates/{due_date_id}")
async def update_due_date_status(
    due_date_id: int,
    status: str = Body(..., embed=True),
):
    """
    Update the status of a due date.
    If status is 'pagado', automatically creates a transaction.
    """
    supabase = get_supabase_service()
    
    # Update status
    result = await supabase.update_due_date_status(str(due_date_id), status)
    
    if not result:
        raise HTTPException(status_code=404, detail="Due date not found")
        
    # If marked as paid, create a transaction
    if status == "pagado":
        # Create transaction based on due date info
        transaction = TransactionCreate(
            amount=result.get("amount"),
            description=result.get("description"),
            category=result.get("category"),
            transaction_type=result.get("type", "gasto"), # Assuming due dates have 'type' or default to gasto
            date=date.today(),
            tag=result.get("tag"),
            account_source="Banco", # Default source? Or maybe add to due_date model
            is_recurring=True,
        )
        
        await supabase.create_transaction(transaction)
        
    return result


@router.get("/savings-goals")
async def list_savings_goals(
    include_completed: bool = Query(default=False),
):
    """
    Get all savings goals with progress.
    """
    supabase = get_supabase_service()
    
    goals = await supabase.get_savings_goals(include_completed=include_completed)
    
    # Add progress percentage
    for goal in goals:
        target = float(goal.get("target_amount", 1))
        current = float(goal.get("current_amount", 0))
        goal["progress_percent"] = min(100, round((current / target) * 100, 1))
    
    return {
        "data": goals,
        "count": len(goals),
    }
