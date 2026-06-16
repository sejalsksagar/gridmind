from fastapi import APIRouter
from app.schemas import RecommendInput, ResourceRecommendation
from app.services import recommendation as rec_svc

router = APIRouter(prefix="/recommend", tags=["Recommendation"])


@router.post("", response_model=ResourceRecommendation)
def get_recommendation(payload: RecommendInput):
    """
    Return resource recommendations for a known congestion class.
    Useful when the frontend already has a prediction and just needs resources.
    """
    return rec_svc.recommend(payload.congestion_class)
