from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Tuple
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class EventType(str, Enum):
    PLANNED   = "planned"
    UNPLANNED = "unplanned"

class EventCause(str, Enum):
    VEHICLE_BREAKDOWN = "vehicle_breakdown"
    ACCIDENT          = "accident"
    CONSTRUCTION      = "construction"
    PUBLIC_EVENT      = "public_event"
    TREE_FALL         = "tree_fall"
    WATER_LOGGING     = "water_logging"
    POT_HOLES         = "pot_holes"
    ROAD_CONDITIONS   = "road_conditions"
    CONGESTION        = "congestion"
    PROCESSION        = "procession"
    VIP_MOVEMENT      = "vip_movement"
    PROTEST           = "protest"
    OTHERS            = "others"

class CongestionClass(str, Enum):
    LOW    = "Low"
    MEDIUM = "Medium"
    HIGH   = "High"
    SEVERE = "Severe"

class DurationClass(str, Enum):
    SHORT  = "Short"    # < 30 min
    MEDIUM = "Medium"   # 30–120 min
    LONG   = "Long"     # > 120 min

class VehType(str, Enum):
    BMTC_BUS      = "bmtc_bus"
    HEAVY_VEHICLE = "heavy_vehicle"
    LCV           = "lcv"
    PRIVATE_BUS   = "private_bus"
    PRIVATE_CAR   = "private_car"
    TRUCK         = "truck"
    KSRTC_BUS     = "ksrtc_bus"
    TAXI          = "taxi"
    AUTO          = "auto"
    OTHERS        = "others"
    UNKNOWN       = "Unknown"


# ─── Request Models ───────────────────────────────────────────────────────────

class EventInput(BaseModel):
    event_type:            EventType
    event_cause:           EventCause
    latitude:              float = Field(..., ge=12.7, le=13.3)
    longitude:             float = Field(..., ge=77.3, le=78.0)
    requires_road_closure: bool
    corridor:              str   = Field(..., description="Named corridor or 'Non-corridor'")
    start_datetime:        str   = Field(..., description="ISO8601 e.g. 2024-06-01T18:00:00+05:30")
    veh_type:              Optional[VehType] = VehType.UNKNOWN

    @field_validator("start_datetime")
    @classmethod
    def validate_dt(cls, v: str) -> str:
        from datetime import datetime
        try:
            datetime.fromisoformat(v)
        except ValueError:
            raise ValueError("start_datetime must be ISO8601")
        return v

class SimulationOverrides(BaseModel):
    requires_road_closure: Optional[bool]       = None
    event_cause:           Optional[EventCause] = None
    start_hour:            Optional[int]        = Field(None, ge=0, le=23)

class SimulationInput(BaseModel):
    base_event: EventInput
    overrides:  SimulationOverrides

class DiversionRequest(BaseModel):
    from_lat:       float = Field(..., ge=12.7, le=13.3)
    from_lng:       float = Field(..., ge=77.3, le=78.0)
    to_lat:         float = Field(..., ge=12.7, le=13.3)
    to_lng:         float = Field(..., ge=77.3, le=78.0)
    avoid_corridor: Optional[str] = None


# ─── Response Models ──────────────────────────────────────────────────────────

class ResourceRecommendation(BaseModel):
    officers:        int
    barricades:      int
    diversions:      int
    signal_overrides: int
    rationale:       str

class AffectedCorridor(BaseModel):
    name:                    str
    severity:                CongestionClass
    estimated_delay_minutes: int

class PredictionResponse(BaseModel):
    congestion_class:       CongestionClass
    confidence:             float = Field(..., ge=0.0, le=1.0)
    duration_class:         DurationClass
    duration_estimate_range: Tuple[int, int]
    affected_corridors:     List[AffectedCorridor]
    resources:              ResourceRecommendation

class SimulationResponse(BaseModel):
    base:      PredictionResponse
    simulated: PredictionResponse
    delta:     dict

class HeatPoint(BaseModel):
    lat:    float
    lng:    float
    weight: float = Field(..., ge=0.0, le=1.0)

class HeatpointsResponse(BaseModel):
    points: List[HeatPoint]
    total:  int

class DiversionResponse(BaseModel):
    route_coordinates: List[Tuple[float, float]]   # [[lat, lng], ...]
    total_distance_m:  int
    total_duration_s:  int
    summary:           str

class HealthResponse(BaseModel):
    status:        str
    models_loaded: bool
    version:       str = "2.0.0"