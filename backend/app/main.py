"""
Finance Bot API - Main Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import webhook, transactions, dashboard
from app.scheduler.reminders import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    settings = get_settings()
    if not settings.DEBUG:
        start_scheduler()
    print("[OK] Finance Bot API started successfully!")
    
    yield
    
    # Shutdown
    shutdown_scheduler()
    print("[STOP] Finance Bot API shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Finance Bot API",
    description="Personal finance management with WhatsApp integration and AI-powered receipt scanning",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhook.router, tags=["WhatsApp Webhook"])
app.include_router(transactions.router, prefix="/api", tags=["Transactions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "status": "healthy",
        "service": "Finance Bot API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "ok"}
