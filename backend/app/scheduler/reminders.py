"""
Reminders Scheduler Module.
Handles automatic reminders for due dates (T-3, T-0, T+1).
"""
import asyncio
from datetime import date
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings
from app.services.supabase_service import get_supabase_service
from app.services.twilio_service import get_twilio_service


# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


def start_scheduler():
    """Initialize and start the scheduler."""
    global scheduler
    
    if scheduler is not None:
        return
    
    scheduler = AsyncIOScheduler(timezone="America/Mexico_City")
    
    # Schedule the daily reminder check at 9:00 AM
    scheduler.add_job(
        check_due_dates,
        CronTrigger(hour=9, minute=0),
        id="daily_due_date_check",
        name="Check Due Dates and Send Reminders",
        replace_existing=True,
    )
    
    # Schedule a weekly summary on Sundays at 10:00 AM
    scheduler.add_job(
        send_weekly_summary,
        CronTrigger(day_of_week="sun", hour=10, minute=0),
        id="weekly_summary",
        name="Send Weekly Financial Summary",
        replace_existing=True,
    )
    
    scheduler.start()
    print("📅 Scheduler started - Reminders will be sent at 9:00 AM daily")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    global scheduler
    
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        scheduler = None
        print("📅 Scheduler shutdown complete")


async def check_due_dates():
    """
    Check for due dates that need reminders.
    Sends notifications for:
    - T-3: 3 days before due date
    - T-0: On the due date
    - T+1: 1 day after due date (overdue)
    """
    print("🔔 Running due date check...")
    
    supabase = get_supabase_service()
    twilio = get_twilio_service()
    
    today = date.today()
    
    # Get all pending due dates
    due_dates = await supabase.get_due_dates(status="pendiente")
    
    reminders_sent = 0
    
    for dd in due_dates:
        try:
            due_date_str = dd.get("due_date")
            if not due_date_str:
                continue
            
            due_date = date.fromisoformat(due_date_str)
            days_until = (due_date - today).days
            
            # Check if we should send a reminder
            should_remind = days_until in [3, 0, -1]
            
            if should_remind and dd.get("phone_to_notify"):
                phone = dd["phone_to_notify"]
                
                # Format the reminder message
                message = twilio.format_reminder(
                    concept=dd["concept"],
                    amount=float(dd.get("amount", 0)),
                    days_until=days_until,
                )
                
                # Add tag info if present
                if dd.get("tag"):
                    message += f"\n🏷️ {dd['tag']}"
                
                # Send the reminder
                await twilio.send_message(phone, message)
                reminders_sent += 1
                
                # Mark as overdue if past due date
                if days_until < 0:
                    await supabase.update_due_date_status(dd["id"], "vencido")
                
                print(f"  ✅ Reminder sent for: {dd['concept']} ({days_until} days)")
        
        except Exception as e:
            print(f"  ❌ Error sending reminder for {dd.get('concept')}: {e}")
    
    print(f"🔔 Due date check complete. Sent {reminders_sent} reminder(s).")


async def send_weekly_summary():
    """
    Send a weekly financial summary to configured users.
    """
    print("📊 Generating weekly summary...")
    
    supabase = get_supabase_service()
    twilio = get_twilio_service()
    
    # Get summary for the past week
    today = date.today()
    start_of_week = today.replace(day=today.day - today.weekday() - 7)  # Last Monday
    
    summary = await supabase.get_transactions_summary(
        start_date=start_of_week,
        end_date=today,
    )
    
    # Get users who have recent activity (distinct phone numbers from conversation context)
    # For now, we'll just log the summary
    # In production, you'd have a user preferences table with notification settings
    
    message = twilio.format_summary(
        total_income=summary["total_income"],
        total_expenses=summary["total_expenses"],
        net_balance=summary["net_balance"],
        period="esta semana",
    )
    
    # Add breakdown by tag
    if summary.get("by_tag"):
        message += "\n\n📁 Por proyecto:"
        for tag, amount in summary["by_tag"].items():
            message += f"\n  {tag}: ${amount:,.2f}"
    
    print(f"📊 Weekly summary generated:\n{message}")
    
    # Note: To actually send this, you'd need a list of subscribed users
    # await twilio.send_message("+52XXXXXXXXXX", message)


async def send_reminder_now(due_date_id: str):
    """
    Manually trigger a reminder for a specific due date.
    Useful for testing or immediate notifications.
    """
    supabase = get_supabase_service()
    twilio = get_twilio_service()
    
    # Get the due date details
    due_dates = await supabase.get_due_dates()
    dd = next((d for d in due_dates if d["id"] == due_date_id), None)
    
    if not dd:
        print(f"Due date not found: {due_date_id}")
        return False
    
    if not dd.get("phone_to_notify"):
        print(f"No phone number configured for: {dd['concept']}")
        return False
    
    today = date.today()
    due_date = date.fromisoformat(dd["due_date"])
    days_until = (due_date - today).days
    
    message = twilio.format_reminder(
        concept=dd["concept"],
        amount=float(dd.get("amount", 0)),
        days_until=days_until,
    )
    
    await twilio.send_message(dd["phone_to_notify"], message)
    print(f"✅ Manual reminder sent for: {dd['concept']}")
    return True
