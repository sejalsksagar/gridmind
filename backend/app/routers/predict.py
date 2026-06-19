"""
app/routers/predict.py

POST /predict — runs ML inference and returns a full PredictionResponse
including dynamic heatmap_points.

CHANGED (refactor): heatmap_points are now generated inside this router
using generate_heatmap_points() from the prediction service.  The frontend
no longer needs to call GET /api/v1/heatpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    CongestionClass,
    EventInput,
    HeatPoint,
    PredictionResponse,
)
from app.services.prediction import generate_heatmap_points, predict
from app.services.recommendation import (
    _DELAY_MINUTES,
    get_affected_corridors,
    recommend,
)

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post(
    "",
    response_model=PredictionResponse,
    summary="Predict congestion class, duration, and generate dynamic heatmap points",
)
async def predict_endpoint(event_input: EventInput) -> PredictionResponse:
    """
    Run severity and duration inference for a traffic event.

    Returns congestion class, confidence, duration estimate, affected
    corridors, recommended resource allocation, and dynamic heatmap points
    ready to render with `mappls.HeatmapLayer`.

    **Frontend note:** Use `response.heatmap_points` directly — no separate
    `GET /api/v1/heatpoints` call is needed.
    """
    # ── 1. ML inference ───────────────────────────────────────────────────
    try:
        prediction = predict(event_input)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Model inference failed") from exc

    congestion_class = CongestionClass(prediction["congestion_class"])

    # ── 2. Corridor impact analysis ───────────────────────────────────────
    affected_corridors = get_affected_corridors(event_input.corridor, congestion_class)

    # ── 3. Resource recommendation ────────────────────────────────────────
    resources = recommend(congestion_class)

    # ── 4. Build affected_corridors list (primary first) ──────────────────
    affected_corridors_payload = [
        {
            "name":                     event_input.corridor,
            "severity":                 congestion_class.value,
            "estimated_delay_minutes":  _DELAY_MINUTES[congestion_class],
        },
        *[
            {
                "name":                    c.name,
                "severity":                c.severity,
                "estimated_delay_minutes": c.estimated_delay_minutes,
            }
            for c in affected_corridors
        ],
    ]

    # ── 5. Generate dynamic heatmap points ────────────────────────────────
    # Names of all corridors that are relevant for secondary heat points
    secondary_corridor_names = [c.name for c in affected_corridors]

    raw_heatmap = generate_heatmap_points(
        event=event_input,
        congestion_class=congestion_class.value,
        affected_corridor_names=secondary_corridor_names,
    )
    heatmap_points = [HeatPoint(**p) for p in raw_heatmap]

    # ── 6. Assemble and return response ───────────────────────────────────
    return PredictionResponse(
        congestion_class=prediction["congestion_class"],
        confidence=prediction["confidence"],
        duration_class=prediction["duration_class"],
        duration_estimate_range=prediction["duration_estimate_range"],
        affected_corridors=affected_corridors_payload,
        resources={
            "officers":        resources.officers,
            "barricades":      resources.barricades,
            "diversions":      resources.diversions,
            "signal_overrides": resources.signal_overrides,
            "rationale":       resources.rationale,
        },
        heatmap_points=heatmap_points,
    )