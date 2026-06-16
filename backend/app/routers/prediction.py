from fastapi import APIRouter, Depends, HTTPException
from app.schemas import EventInput, PredictionResponse, CongestionClass
from app.services import prediction as pred_svc
from app.services import recommendation as rec_svc
from app.core import get_settings

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("", response_model=PredictionResponse)
def predict_event(event: EventInput, settings=Depends(get_settings)):
    """
    Predict congestion class, duration, and resource requirements
    for a given traffic event.
    """
    try:
        raw = pred_svc.predict(event, use_mock=settings.USE_MOCK_MODELS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    cc = CongestionClass(raw["congestion_class"])

    return PredictionResponse(
        congestion_class=cc,
        confidence=raw["confidence"],
        duration_class=raw["duration_class"],
        duration_estimate_range=raw["duration_estimate_range"],
        affected_corridors=rec_svc.get_affected_corridors(event.corridor, cc),
        resources=rec_svc.recommend(cc),
    )
