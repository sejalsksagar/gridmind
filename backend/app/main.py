from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.routers import predict, simulate, corridors, heatpoints, diversion


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try loading ML models at startup (safe — server still starts if they fail)
    try:
        from app.services.prediction import load_models
        load_models()
        app.state.models_loaded = True
        print("✅ ML models loaded successfully")
    except Exception as e:
        app.state.models_loaded = False
        print(f"⚠️  Models not loaded (mock mode active): {e}")
    yield


app = FastAPI(
    title="GridMind API",
    description="AI Traffic Command Center — Gridlock Hackathon 2.0",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(predict.router,    prefix="/api/v1", tags=["Prediction"])
app.include_router(simulate.router,   prefix="/api/v1", tags=["Simulation"])
app.include_router(corridors.router,  prefix="/api/v1", tags=["Corridors"])
app.include_router(heatpoints.router, prefix="/api/v1", tags=["Heatpoints"])
app.include_router(diversion.router,  prefix="/api/v1", tags=["Diversion"])


# ── Global error handlers ─────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code":    "VALIDATION_ERROR",
                "message": "Request validation failed",
                "fields":  [
                    {"field": " -> ".join(str(l) for l in e["loc"]), "message": e["msg"]}
                    for e in exc.errors()
                ],
            }
        },
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    import logging
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/v1/health", tags=["Health"])
def health():
    return {
        "status":        "ok",
        "models_loaded": getattr(app.state, "models_loaded", False),
        "version":       "2.0.0",
    }