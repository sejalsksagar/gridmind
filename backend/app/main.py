"""
GridMind API — FastAPI Application
────────────────────────────────────
Start with:
  uvicorn app.main:app --reload --port 8000

Docs at: http://localhost:8000/docs
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import get_settings
from app.routers import prediction, simulation, recommendation, map
from app.services.prediction import models_available


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.USE_MOCK_MODELS:
        print("⚠️  Running in MOCK MODE — set USE_MOCK_MODELS=false to use real models")
    else:
        if models_available():
            print("✅ LightGBM models loaded from ml/artifacts/")
        else:
            print("❌ Model pkl files not found — falling back to mock predictions")
            print("   Run: cd ml && python train.py to generate artifacts")
    yield


settings = get_settings()

app = FastAPI(
    title="GridMind API",
    description="AI Traffic Command Center — Event-Driven Congestion Prediction for Bengaluru",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

PREFIX = "/api/v1"

app.include_router(prediction.router, prefix=PREFIX)
app.include_router(simulation.router, prefix=PREFIX)
app.include_router(recommendation.router, prefix=PREFIX)
app.include_router(map.router, prefix=PREFIX)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "models_loaded": models_available(),
        "mock_mode": settings.USE_MOCK_MODELS,
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }


@app.get("/", include_in_schema=False)
def root():
    return {"message": "GridMind API is running. Visit /docs for API reference."}
