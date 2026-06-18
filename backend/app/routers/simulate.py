from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    SimulationInput, SimulationResponse,
    PredictionResponse, CongestionClass,
)
from app.services.simulation import apply_overrides, build_delta
from app.services.recommendation import recommend, get_affected_corridors

router = APIRouter()


def _run_prediction(event) -> dict:
    """
    Day 1-2: mock prediction.
    Day 3: swap for real ml_predict(event).
    """
    # from app.services.prediction import predict as ml_predict
    # return ml_predict(event)
    return {
        "congestion_class":        "Severe",
        "confidence":              0.91,
        "duration_class":          "Long",
        "duration_estimate_range": (120, 240),
    }


def _enrich(result: dict, corridor: str) -> PredictionResponse:
    """Adds affected_corridors and resources to a raw prediction dict."""
    cc        = CongestionClass(result["congestion_class"])
    affected  = get_affected_corridors(corridor, cc)
    resources = recommend(cc)
    return PredictionResponse(
        congestion_class=cc,
        confidence=result["confidence"],
        duration_class=result["duration_class"],
        duration_estimate_range=result["duration_estimate_range"],
        affected_corridors=affected,
        resources=resources,
    )


@router.post("/simulate", response_model=SimulationResponse)
def simulate(body: SimulationInput):
    """
    Applies overrides to the base event and returns before/after predictions
    plus a delta showing how much the intervention helps.

    Example delta:
      {"congestion_class": "Severe -> High", "officers": -8, "barricades": -2}
    """
    try:
        base_result = _run_prediction(body.base_event)
        base_resp   = _enrich(base_result, body.base_event.corridor)

        modified_event = apply_overrides(body.base_event, body.overrides)
        sim_result     = _run_prediction(modified_event)
        sim_resp       = _enrich(sim_result, modified_event.corridor)

        delta = build_delta(
            base_resp.model_dump(),
            sim_resp.model_dump(),
        )

        return SimulationResponse(
            base=base_resp,
            simulated=sim_resp,
            delta=delta,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")