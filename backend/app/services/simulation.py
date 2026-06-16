"""
Simulation Engine
─────────────────
Applies operator overrides to a base event, re-runs prediction,
and returns both results plus a human-readable delta.
"""

from datetime import datetime, timezone, timedelta
from app.schemas import (
    EventInput, SimulationOverrides, SimulationResponse,
    SimulationDelta, PredictionResponse,
)
from app.services import prediction as pred_svc
from app.services import recommendation as rec_svc

IST = timezone(timedelta(hours=5, minutes=30))


def _enrich(raw: dict, event: EventInput) -> PredictionResponse:
    from app.schemas import CongestionClass
    cc = CongestionClass(raw["congestion_class"])
    return PredictionResponse(
        congestion_class=cc,
        confidence=raw["confidence"],
        duration_class=raw["duration_class"],
        duration_estimate_range=raw["duration_estimate_range"],
        affected_corridors=rec_svc.get_affected_corridors(event.corridor, cc),
        resources=rec_svc.recommend(cc),
    )


def simulate(payload: dict, use_mock: bool = False) -> SimulationResponse:
    from app.schemas import SimulationInput
    data = SimulationInput(**payload) if isinstance(payload, dict) else payload

    base_event = data.base_event
    overrides = data.overrides

    # --- mutate a copy of the base event ---
    mutated_data = base_event.model_dump()

    if overrides.requires_road_closure is not None:
        mutated_data["requires_road_closure"] = overrides.requires_road_closure

    if overrides.event_cause is not None:
        mutated_data["event_cause"] = overrides.event_cause.value

    if overrides.start_hour is not None:
        dt = datetime.fromisoformat(base_event.start_datetime).astimezone(IST)
        new_dt = dt.replace(hour=overrides.start_hour, minute=0, second=0)
        mutated_data["start_datetime"] = new_dt.isoformat()

    mutated_event = EventInput(**mutated_data)

    # --- run both predictions ---
    base_raw = pred_svc.predict(base_event, use_mock=use_mock)
    sim_raw = pred_svc.predict(mutated_event, use_mock=use_mock)

    base_full = _enrich(base_raw, base_event)
    sim_full = _enrich(sim_raw, mutated_event)

    delta = SimulationDelta(
        congestion_class=f"{base_full.congestion_class.value} → {sim_full.congestion_class.value}",
        officers=sim_full.resources.officers - base_full.resources.officers,
        barricades=sim_full.resources.barricades - base_full.resources.barricades,
        diversions=sim_full.resources.diversions - base_full.resources.diversions,
        confidence_change=round(sim_full.confidence - base_full.confidence, 3),
    )

    severity_order = {"Low": 0, "Medium": 1, "High": 2, "Severe": 3}
    improved = (
        severity_order[sim_full.congestion_class.value]
        < severity_order[base_full.congestion_class.value]
    )

    return SimulationResponse(
        base=base_full,
        simulated=sim_full,
        delta=delta,
        improved=improved,
    )
