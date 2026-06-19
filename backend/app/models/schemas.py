from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class EventType(str, Enum):
    PLANNED = "planned"
    UNPLANNED = "unplanned"


class EventCause(str, Enum):
    VEHICLE_BREAKDOWN = "vehicle_breakdown"
    ACCIDENT = "accident"
    CONSTRUCTION = "construction"
    PUBLIC_EVENT = "public_event"
    TREE_FALL = "tree_fall"
    WATER_LOGGING = "water_logging"
    POT_HOLES = "pot_holes"
    ROAD_CONDITIONS = "road_conditions"
    CONGESTION = "congestion"
    PROCESSION = "procession"
    VIP_MOVEMENT = "vip_movement"
    PROTEST = "protest"
    OTHERS = "others"


class CongestionClass(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    SEVERE = "Severe"


class DurationClass(str, Enum):
    SHORT = "Short"
    MEDIUM = "Medium"
    LONG = "Long"


class VehType(str, Enum):
    BMTC_BUS = "bmtc_bus"
    HEAVY_VEHICLE = "heavy_vehicle"
    LCV = "lcv"
    PRIVATE_BUS = "private_bus"
    PRIVATE_CAR = "private_car"
    TRUCK = "truck"
    KSRTC_BUS = "ksrtc_bus"
    TAXI = "taxi"
    AUTO = "auto"
    UNKNOWN = "Unknown"


# ─── Request Schemas ──────────────────────────────────────────────────────────

class EventInput(BaseModel):
    event_type: EventType
    event_cause: EventCause
    latitude: float = Field(..., ge=12.7, le=13.3, description="Bengaluru latitude range")
    longitude: float = Field(..., ge=77.3, le=78.0, description="Bengaluru longitude range")
    requires_road_closure: bool
    corridor: str = Field(..., min_length=1, description="Named corridor or 'Non-corridor'")
    start_datetime: str = Field(..., description="ISO8601, e.g. 2024-06-01T18:00:00+05:30")
    veh_type: Optional[VehType] = VehType.UNKNOWN

    @field_validator("start_datetime")
    @classmethod
    def validate_datetime(cls, v: str) -> str:
        from datetime import datetime
        try:
            datetime.fromisoformat(v)
        except ValueError:
            raise ValueError("start_datetime must be valid ISO8601 with timezone")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "event_type": "unplanned",
                "event_cause": "construction",
                "latitude": 13.040004,
                "longitude": 77.518099,
                "requires_road_closure": True,
                "corridor": "Tumkur Road",
                "start_datetime": "2024-06-01T18:00:00+05:30",
                "veh_type": "heavy_vehicle",
            }
        }
    }


class SimulationOverrides(BaseModel):
    requires_road_closure: Optional[bool] = None
    event_cause: Optional[EventCause] = None
    start_hour: Optional[int] = Field(None, ge=0, le=23)

    model_config = {
        "json_schema_extra": {
            "example": {
                "requires_road_closure": False,
                "start_hour": 10,
            }
        }
    }


class SimulationInput(BaseModel):
    base_event: EventInput
    overrides: SimulationOverrides


class RecommendInput(BaseModel):
    congestion_class: CongestionClass


# ─── Response Schemas ─────────────────────────────────────────────────────────

class ResourceRecommendation(BaseModel):
    officers: int
    barricades: int
    diversions: int
    signal_overrides: int
    rationale: str


class AffectedCorridor(BaseModel):
    name: str
    severity: CongestionClass
    estimated_delay_minutes: int


# NEW — dynamic replacement for static heatpoints.json
class HeatPoint(BaseModel):
    """A single point for the MapmyIndia HeatmapLayer.

    Generated dynamically per prediction rather than loaded from a pre-baked
    JSON file.  Weight is driven by the predicted congestion class:
      Low → 0.25 | Medium → 0.50 | High → 0.75 | Severe → 1.00
    """
    lat: float
    lng: float
    weight: float = Field(..., ge=0.0, le=1.0)
    severity: str   # human-readable label, mirrors CongestionClass values


# CHANGED — heatmap_points field added; mock_mode removed (no longer needed)
class PredictionResponse(BaseModel):
    congestion_class: CongestionClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    duration_class: DurationClass
    duration_estimate_range: tuple[int, int]
    affected_corridors: list[AffectedCorridor]
    resources: ResourceRecommendation
    heatmap_points: list[HeatPoint] = Field(
        default_factory=list,
        description=(
            "Dynamic heatmap points derived from this prediction. "
            "Always contains at least one point at the event location. "
            "Feed directly to mappls.HeatmapLayer — no separate /heatpoints call needed."
        ),
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "congestion_class": "Severe",
                "confidence": 0.972,
                "duration_class": "Long",
                "duration_estimate_range": [120, 240],
                "affected_corridors": [
                    {"name": "Tumkur Road", "severity": "Severe", "estimated_delay_minutes": 45},
                    {"name": "Bellary Road 1", "severity": "High", "estimated_delay_minutes": 20},
                ],
                "resources": {
                    "officers": 18,
                    "barricades": 5,
                    "diversions": 2,
                    "signal_overrides": 3,
                    "rationale": "Severe congestion on named corridor with road closure. Maximum deployment required.",
                },
                "heatmap_points": [
                    {"lat": 13.040004, "lng": 77.518099, "weight": 1.0, "severity": "Severe"},
                ],
            }
        }
    }


class SimulationDelta(BaseModel):
    congestion_class: str
    officers: int
    barricades: int
    diversions: int
    signal_overrides: int          # was missing — caused field to be silently dropped
    confidence_change: float


class SimulationResponse(BaseModel):
    base: PredictionResponse
    simulated: PredictionResponse
    delta: SimulationDelta
    improved: bool


class GeoJSONResponse(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[dict]


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    version: str = "2.0.0"
    environment: str