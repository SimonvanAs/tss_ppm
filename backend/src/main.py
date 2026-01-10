# TSS PPM v3.0 - FastAPI Application Entry Point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="TSS PPM API",
    description="Performance Portfolio Management API",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {"status": "healthy"}


@app.get("/ready")
async def readiness_check():
    """Readiness check - verifies database and dependencies."""
    # TODO: Add database connectivity check
    return {"status": "ready"}


# TODO: Import and include routers
# from src.routers import auth, reviews, goals, users, calibration, voice
# app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# app.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
# app.include_router(goals.router, prefix="/goals", tags=["Goals"])
# app.include_router(users.router, prefix="/users", tags=["Users"])
# app.include_router(calibration.router, prefix="/calibration", tags=["Calibration"])
# app.include_router(voice.router, prefix="/voice", tags=["Voice"])
