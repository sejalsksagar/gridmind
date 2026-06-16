from fastapi import APIRouter, Depends, HTTPException
from app.schemas import SimulationInput, SimulationResponse
from app.services import simulation as sim_svc
from app.core import get_settings

router = APIRouter(prefix="/simulate", tags=["Simulation"])


@router.post("", response_model=SimulationResponse)
def simulate_event(payload: SimulationInput, settings=Depends(get_settings)):
    """
    Run a what-if simulation by applying overrides to a base event.
    Returns base prediction, simulated prediction, and a human-readable delta.
    """
    try:
        return sim_svc.simulate(payload, use_mock=settings.USE_MOCK_MODELS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
