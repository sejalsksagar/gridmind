"""
Simulation Engine
─────────────────
Applies operator overrides to a base event, re-runs prediction,
and returns both results plus a human-readable delta.
"""

from datetime import datetime, timezone, timedelta
from app.models.schemas import (
    EventInput, SimulationOverrides, SimulationResponse,
    SimulationDelta, PredictionResponse, CongestionClass, HeatPoint, SimulationInput,
)
from app.services import prediction as pred_svc
from app.services import recommendation as rec_svc

IST = timezone(timedelta(hours=5, minutes=30))

# Weight per congestion class, as documented on HeatPoint.
_HEAT_WEIGHT: dict[str, float] = {
    "Low": 0.25,
    "Medium": 0.50,
    "High": 0.75,
    "Severe": 1.00,
}


def _enrich(raw: dict, event: EventInput) -> PredictionResponse:
    cc = CongestionClass(raw["congestion_class"])
    corridors = rec_svc.get_affected_corridors(event.corridor, cc)

    # --- build heatmap_points -----------------------------------------
    # Primary point sits at the exact event location.
    heatmap_points: list[HeatPoint] = [
        HeatPoint(
            lat=event.latitude,
            lng=event.longitude,
            weight=_HEAT_WEIGHT[cc.value],
            severity=cc.value,
        )
    ]
    # Each affected corridor contributes a secondary point, offset slightly
    # so the heatmap shows spatial spread rather than a single dot.
    for i, corridor in enumerate(corridors):
        # cascaded_severity may be a CongestionClass or a plain str depending
        # on what get_affected_corridors returns; normalise defensively.
        raw_sev = getattr(corridor, "cascaded_severity", cc)
        try:
            corridor_cc = CongestionClass(raw_sev) if not isinstance(raw_sev, CongestionClass) else raw_sev
        except ValueError:
            corridor_cc = cc

        heatmap_points.append(
            HeatPoint(
                lat=round(event.latitude  + (i + 1) * 0.002, 6),
                lng=round(event.longitude + (i + 1) * 0.002, 6),
                weight=_HEAT_WEIGHT[corridor_cc.value],
                severity=corridor_cc.value,
            )
        )
    # ------------------------------------------------------------------

    return PredictionResponse(
        congestion_class=cc,
        confidence=raw["confidence"],
        duration_class=raw["duration_class"],
        duration_estimate_range=raw["duration_estimate_range"],
        affected_corridors=corridors,
        resources=rec_svc.recommend(cc),
        heatmap_points=heatmap_points,
    )


def simulate(payload: dict, use_mock: bool = False) -> SimulationResponse:
    # from app.models.schemas import SimulationInput
    data = SimulationInput(**payload) if isinstance(payload, dict) else payload

    base_event = data.base_event
    overrides  = data.overrides

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
    base_raw = pred_svc.predict(base_event)
    sim_raw  = pred_svc.predict(mutated_event)

    base_full = _enrich(base_raw, base_event)
    sim_full  = _enrich(sim_raw,  mutated_event)

    delta = SimulationDelta(
        congestion_class=f"{base_full.congestion_class.value} → {sim_full.congestion_class.value}",
        officers        =sim_full.resources.officers       - base_full.resources.officers,
        barricades      =sim_full.resources.barricades     - base_full.resources.barricades,
        diversions      =sim_full.resources.diversions     - base_full.resources.diversions,
        signal_overrides=sim_full.resources.signal_overrides - base_full.resources.signal_overrides,
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