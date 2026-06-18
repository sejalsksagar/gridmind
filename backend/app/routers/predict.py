from fastapi import APIRouter, HTTPException
from app.models.schemas import EventInput, PredictionResponse, CongestionClass

router = APIRouter()


def _mock_predict(event: EventInput) -> dict:
    """
    Mock prediction — used until Dev 1 commits real .pkl files on Day 3.
    Always returns Severe for the demo scenario.
    """
    return {
        "congestion_class":        "Severe",
        "confidence":              0.91,
        "duration_class":          "Long",
        "duration_estimate_range": (120, 240),
    }


@router.post("/predict", response_model=PredictionResponse)
def predict(event: EventInput):
    """
    Predicts congestion class, duration, affected corridors and resources.

    Day 1-2: returns hardcoded mock (Severe) so frontend can build UI.
    Day 3:   uncomment the real predict() call below once pkl files are ready.
    """
    try:
        # ── Day 3: swap mock for real prediction ──────────────────────────
        # from app.services.prediction import predict as ml_predict
        # result = ml_predict(event)
        result = _mock_predict(event)
        # ─────────────────────────────────────────────────────────────────

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model inference failed: {e}")

    from app.services.recommendation import recommend, get_affected_corridors
    cc       = CongestionClass(result["congestion_class"])
    affected = get_affected_corridors(event.corridor, cc)
    resources = recommend(cc)

    return PredictionResponse(
        congestion_class=cc,
        confidence=result["confidence"],
        duration_class=result["duration_class"],
        duration_estimate_range=result["duration_estimate_range"],
        affected_corridors=affected,
        resources=resources,
    )