"""
Dashboard Router.
API endpoints for dashboard visualizations and analytics.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Query

from app.services.supabase_service import get_supabase_service
from app.services.crypto_service import get_crypto_prices

router = APIRouter()


@router.get("/summary")
async def get_summary(
    period: str = Query(default="month", description="Period: day, week, month, year, all"),
):
    """
    Get financial summary for the specified period.
    Returns total income, expenses, and net balance.
    """
    supabase = get_supabase_service()
    
    # Calculate date range
    today = date.today()
    start_date = None
    end_date = today
    
    if period == "day":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = today.replace(day=1)
    elif period == "year":
        start_date = today.replace(month=1, day=1)
    # 'all' leaves start_date as None
    
    summary = await supabase.get_transactions_summary(
        start_date=start_date,
        end_date=end_date,
    )
    
    summary["period"] = period
    summary["start_date"] = str(start_date) if start_date else None
    summary["end_date"] = str(end_date)
    
    return summary


@router.get("/cashflow")
async def get_cashflow():
    """
    Get daily cash flow data for the current month.
    Returns income and expenses per day for the current month only.
    """
    supabase = get_supabase_service()
    
    today = date.today()
    # Start from the first day of the current month
    start_date = today.replace(day=1)
    
    transactions = await supabase.get_transactions(
        limit=500,
        start_date=start_date,
        end_date=today,
    )
    
    # Aggregate by day for the current month
    daily_data = {}
    current = start_date
    while current <= today:
        day_key = str(current)
        day_label = current.strftime("%d")  # Just the day number
        daily_data[day_key] = {
            "date": day_key,
            "day": day_label,
            "income": 0,
            "expenses": 0
        }
        current += timedelta(days=1)
    
    for tx in transactions:
        tx_date = tx.get("date")
        if tx_date and tx_date in daily_data:
            amount = float(tx.get("amount", 0))
            if tx.get("type") == "ingreso":
                daily_data[tx_date]["income"] += amount
            else:
                daily_data[tx_date]["expenses"] += amount
    
    # Convert to list sorted by date
    cashflow = sorted(daily_data.values(), key=lambda x: x["date"])
    
    # Add cumulative balance
    cumulative = 0
    for day in cashflow:
        cumulative += day["income"] - day["expenses"]
        day["balance"] = round(cumulative, 2)
        day["income"] = round(day["income"], 2)
        day["expenses"] = round(day["expenses"], 2)
    
    month_name = today.strftime("%B %Y")
    
    return {
        "data": cashflow,
        "month_name": month_name,
        "start_date": str(start_date),
        "end_date": str(today),
    }


@router.get("/by-tag")
async def get_distribution_by_tag(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
):
    """
    Get expense distribution by project tag (#Asces, #LabCasa, #Personal).
    """
    supabase = get_supabase_service()
    
    # Default to current month if no dates provided
    if not start_date:
        today = date.today()
        start_date = today.replace(day=1)
    if not end_date:
        end_date = date.today()
    
    transactions = await supabase.get_transactions(
        limit=1000,
        start_date=start_date,
        end_date=end_date,
    )
    
    # Aggregate by tag
    by_tag = {
        "#Asces": {"tag": "#Asces", "total": 0, "count": 0, "color": "#3B82F6"},
        "#LabCasa": {"tag": "#LabCasa", "total": 0, "count": 0, "color": "#10B981"},
        "#Personal": {"tag": "#Personal", "total": 0, "count": 0, "color": "#8B5CF6"},
        "Sin etiqueta": {"tag": "Sin etiqueta", "total": 0, "count": 0, "color": "#6B7280"},
    }
    
    total_amount = 0
    for tx in transactions:
        if tx.get("type") == "ingreso":
            continue  # Only count expenses
        
        tag = tx.get("tag") or "Sin etiqueta"
        amount = float(tx.get("amount", 0))
        
        if tag in by_tag:
            by_tag[tag]["total"] += amount
            by_tag[tag]["count"] += 1
            total_amount += amount
    
    # Calculate percentages
    for tag_data in by_tag.values():
        if total_amount > 0:
            tag_data["percentage"] = round((tag_data["total"] / total_amount) * 100, 1)
        else:
            tag_data["percentage"] = 0
        tag_data["total"] = round(tag_data["total"], 2)
    
    return {
        "data": list(by_tag.values()),
        "total_expenses": round(total_amount, 2),
        "start_date": str(start_date),
        "end_date": str(end_date),
    }


@router.get("/by-category")
async def get_distribution_by_category(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    tag: Optional[str] = Query(default=None, description="Filter by project tag"),
):
    """
    Get expense distribution by category.
    """
    supabase = get_supabase_service()
    
    # Default to current month
    if not start_date:
        today = date.today()
        start_date = today.replace(day=1)
    if not end_date:
        end_date = date.today()
    
    transactions = await supabase.get_transactions(
        limit=1000,
        start_date=start_date,
        end_date=end_date,
        tag=tag,
    )
    
    # Get category metadata
    categories = await supabase.get_categories()
    category_meta = {c["name"]: c for c in categories}
    
    # Aggregate by category
    by_category = {}
    total_amount = 0
    
    for tx in transactions:
        if tx.get("type") == "ingreso":
            continue
        
        category = tx.get("category") or "Otros"
        amount = float(tx.get("amount", 0))
        
        if category not in by_category:
            meta = category_meta.get(category, {})
            by_category[category] = {
                "category": category,
                "total": 0,
                "count": 0,
                "budget_limit": meta.get("budget_limit"),
                "icon": meta.get("icon", "📦"),
                "color": meta.get("color", "#6B7280"),
            }
        
        by_category[category]["total"] += amount
        by_category[category]["count"] += 1
        total_amount += amount
    
    # Calculate percentages and budget usage
    for cat_data in by_category.values():
        if total_amount > 0:
            cat_data["percentage"] = round((cat_data["total"] / total_amount) * 100, 1)
        else:
            cat_data["percentage"] = 0
        
        if cat_data["budget_limit"]:
            cat_data["budget_used_percent"] = round(
                (cat_data["total"] / float(cat_data["budget_limit"])) * 100, 1
            )
        else:
            cat_data["budget_used_percent"] = None
        
        cat_data["total"] = round(cat_data["total"], 2)
    
    # Sort by total descending
    sorted_categories = sorted(by_category.values(), key=lambda x: x["total"], reverse=True)
    
    return {
        "data": sorted_categories,
        "total_expenses": round(total_amount, 2),
        "start_date": str(start_date),
        "end_date": str(end_date),
        "tag_filter": tag,
    }


@router.get("/calendar")
async def get_calendar(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
):
    """
    Get calendar data with due dates and transactions for a specific month.
    """
    supabase = get_supabase_service()
    
    # Calculate date range for the month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # Get due dates
    due_dates = await supabase.get_due_dates(
        start_date=start_date,
        end_date=end_date,
    )
    
    # Get transactions
    transactions = await supabase.get_transactions(
        limit=500,
        start_date=start_date,
        end_date=end_date,
    )
    
    # Build calendar days
    calendar_days = {}
    current = start_date
    while current <= end_date:
        calendar_days[str(current)] = {
            "date": str(current),
            "due_dates": [],
            "transactions": [],
            "total_income": 0,
            "total_expenses": 0,
        }
        current += timedelta(days=1)
    
    # Add due dates to calendar
    today = date.today()
    for dd in due_dates:
        dd_date = dd.get("due_date")
        if dd_date and dd_date in calendar_days:
            days_until = (date.fromisoformat(dd_date) - today).days
            calendar_days[dd_date]["due_dates"].append({
                **dd,
                "days_until": days_until,
                "is_overdue": days_until < 0 and dd.get("status") == "pendiente",
            })
    
    # Add transactions to calendar
    for tx in transactions:
        tx_date = tx.get("date")
        if tx_date and tx_date in calendar_days:
            calendar_days[tx_date]["transactions"].append(tx)
            amount = float(tx.get("amount", 0))
            if tx.get("type") == "ingreso":
                calendar_days[tx_date]["total_income"] += amount
            else:
                calendar_days[tx_date]["total_expenses"] += amount
    
    # Round totals
    for day in calendar_days.values():
        day["total_income"] = round(day["total_income"], 2)
        day["total_expenses"] = round(day["total_expenses"], 2)
    
    return {
        "month": month,
        "year": year,
        "days": list(calendar_days.values()),
        "due_dates_count": len(due_dates),
        "transactions_count": len(transactions),
    }


@router.get("/savings")
async def get_savings_progress():
    """
    Get savings goals with progress data.
    """
    supabase = get_supabase_service()
    
    goals = await supabase.get_savings_goals(include_completed=True)
    
    active_goals = []
    completed_goals = []
    
    for goal in goals:
        target = float(goal.get("target_amount", 1))
        current = float(goal.get("current_amount", 0))
        progress = min(100, round((current / target) * 100, 1))
        
        goal_data = {
            **goal,
            "progress_percent": progress,
            "remaining": round(max(0, target - current), 2),
        }
        
        if goal.get("is_completed"):
            completed_goals.append(goal_data)
        else:
            active_goals.append(goal_data)
    
    total_target = sum(float(g.get("target_amount", 0)) for g in goals if not g.get("is_completed"))
    total_current = sum(float(g.get("current_amount", 0)) for g in goals if not g.get("is_completed"))
    
    return {
        "active_goals": active_goals,
        "completed_goals": completed_goals,
        "total_target": round(total_target, 2),
        "total_current": round(total_current, 2),
        "total_progress_percent": round((total_current / total_target * 100), 1) if total_target > 0 else 0,
    }


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = Query(default=10, le=100),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
):
    """
    Get recent transactions for activity feed.
    """
    supabase = get_supabase_service()
    
    transactions = await supabase.get_transactions(
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        payment_status="pagado",
        include_income=True
    )
    
    return {
        "data": transactions,
        "count": len(transactions),
    }

@router.get("/crypto-prices")
async def get_dashboard_crypto_prices():
    """
    Get current crypto prices from CoinGecko.
    """
    data = await get_crypto_prices()
    return {"data": data}
