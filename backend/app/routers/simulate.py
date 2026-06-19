"""
app/routers/simulate.py

POST /simulate — compares a base traffic event against a mutated variant
and returns both predictions plus a delta summary.

All business logic lives in app.services.simulation; this module is
intentionally thin (routing + error handling only).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import SimulationInput, SimulationResponse
from app.services.simulation import simulate

router = APIRouter(prefix="/simulate", tags=["Simulation"])


@router.post("", response_model=SimulationResponse)
async def simulate_endpoint(payload: SimulationInput) -> SimulationResponse:
    """
    Run two predictions — one for the base event, one for the mutated
    (overridden) event — and return both results plus a delta summary.

    Each ``PredictionResponse`` (base and simulated) includes ``heatmap_points``
    ready for use with ``mappls.HeatmapLayer``; no separate ``/heatpoints``
    call is needed.
    """
    try:
        return simulate(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Simulation failed: {exc}",
        ) from exc