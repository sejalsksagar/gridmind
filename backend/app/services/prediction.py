"""
backend/app/services/prediction.py

GridMind AI Traffic Command Center — Prediction Service
Loads LightGBM classifiers and label artifacts once via lru_cache,
builds feature vectors from EventInput, and returns congestion/duration
predictions with confidence scores and dynamic heatmap points.

CHANGED (refactor): predict() now also returns `heatmap_points`.
  - The event location is always included as the primary heat point.
  - Affected corridor centroids are included as secondary heat points,
    weighted by their cascaded severity rather than the primary class.
  - This eliminates the dependency on app/data/heatpoints.json and the
    separate GET /api/v1/heatpoints endpoint.
"""

from __future__ import annotations

import functools
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
from dateutil import parser as dtparser

from app.models.schemas import EventInput

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

possible_dirs = [
    BASE_DIR / "models" / "ml",
    BASE_DIR / "app" / "models" / "ml",
]

MODELS_DIR = next(
    (p for p in possible_dirs if p.exists()),
    possible_dirs[0]
)

print(f"Using models directory: {MODELS_DIR}")

IST = ZoneInfo("Asia/Kolkata")

FEATURE_COLUMNS: list[str] = [
    "event_type",
    "event_cause",
    "veh_type",
    "corridor",
    "latitude",
    "longitude",
    "requires_road_closure",
    "hour",
    "weekday",
    "is_weekend",
    "month",
    "peak_hour",
    "geo_cluster",
    "corridor_hour_freq",
]

CATEGORICAL_COLUMNS: list[str] = [
    "event_type",
    "event_cause",
    "veh_type",
    "corridor",
]

DURATION_RANGES: dict[str, tuple[int, int]] = {
    "Short":  (5, 30),
    "Medium": (30, 120),
    "Long":   (120, 240),
}

PEAK_MORNING_START = 8
PEAK_MORNING_END = 11
PEAK_EVENING_START = 17
PEAK_EVENING_END = 20

UNSEEN_LABEL = "__unseen__"

# NEW — severity → heatmap weight mapping (single source of truth)
SEVERITY_WEIGHTS: dict[str, float] = {
    "Low":    0.25,
    "Medium": 0.50,
    "High":   0.75,
    "Severe": 1.00,
}

# NEW — known corridor centroids for secondary heatmap points.
# Extend this dict as more corridors are added to the model.
CORRIDOR_CENTROIDS: dict[str, tuple[float, float]] = {
    "Tumkur Road":          (13.040004, 77.518099),
    "Mysore Road":          (12.954800, 77.510000),
    "Hosur Road":           (12.890000, 77.640000),
    "Bellary Road 1":       (13.050000, 77.590000),
    "Bellary Road 2":       (13.080000, 77.600000),
    "ORR East 1":           (12.960000, 77.700000),
    "ORR East 2":           (12.940000, 77.710000),
    "ORR North 1":          (13.060000, 77.630000),
    "ORR North 2":          (13.070000, 77.640000),
    "Old Madras Road":      (13.000000, 77.660000),
    "Magadi Road":          (12.975000, 77.500000),
    "Bannerghatta Road":    (12.870000, 77.597000),
    "West of Chord Road":   (13.010000, 77.530000),
}


# ---------------------------------------------------------------------------
# Artifact loading  (cached — executed exactly once per process lifetime)
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=None)
def _load_severity_model() -> Any:
    path = MODELS_DIR / "severity_model.pkl"
    return joblib.load(path)


@functools.lru_cache(maxsize=None)
def _load_duration_model() -> Any:
    path = MODELS_DIR / "duration_model.pkl"
    return joblib.load(path)


@functools.lru_cache(maxsize=None)
def _load_label_encoders() -> dict[str, Any]:
    path = MODELS_DIR / "label_encoders.pkl"
    return joblib.load(path)


def _get_artifacts() -> dict[str, Any]:
    encoders = _load_label_encoders()
    return {
        "severity_model": _load_severity_model(),
        "duration_model": _load_duration_model(),
        **encoders,
    }


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def _encode_categorical(value: str, column: str, encoders: dict[str, Any]) -> int:
    le = encoders[column]
    if value in le.classes_:
        return int(le.transform([value])[0])
    if UNSEEN_LABEL in le.classes_:
        return int(le.transform([UNSEEN_LABEL])[0])
    return 0


def build_feature_vector(event: EventInput) -> pd.DataFrame:
    artifacts = _get_artifacts()
    cat_encoders: dict[str, Any] = artifacts["categorical"]
    kmeans = artifacts["kmeans"]
    freq_map: pd.Series = artifacts["freq_map"]

    dt_parsed = dtparser.isoparse(event.start_datetime)
    if dt_parsed.tzinfo is None:
        from datetime import timezone
        dt_parsed = dt_parsed.replace(tzinfo=timezone.utc)
    dt_ist = dt_parsed.astimezone(IST)

    hour: int = dt_ist.hour
    weekday: int = dt_ist.weekday()
    month: int = dt_ist.month
    is_weekend: int = int(weekday >= 5)
    peak_hour: int = int(
        (PEAK_MORNING_START <= hour <= PEAK_MORNING_END)
        or (PEAK_EVENING_START <= hour <= PEAK_EVENING_END)
    )

    geo_cluster: int = int(kmeans.predict([[event.latitude, event.longitude]])[0])

    freq_key = (event.corridor, hour)
    corridor_hour_freq: float = float(freq_map[freq_key]) if freq_key in freq_map.index else 0.0

    veh_type_value: str = event.veh_type if event.veh_type else "Unknown"

    row: dict[str, Any] = {
        "event_type":          _encode_categorical(event.event_type,  "event_type",  cat_encoders),
        "event_cause":         _encode_categorical(event.event_cause, "event_cause", cat_encoders),
        "veh_type":            _encode_categorical(veh_type_value,    "veh_type",    cat_encoders),
        "corridor":            _encode_categorical(event.corridor,    "corridor",    cat_encoders),
        "latitude":            float(event.latitude),
        "longitude":           float(event.longitude),
        "requires_road_closure": int(event.requires_road_closure),
        "hour":                hour,
        "weekday":             weekday,
        "is_weekend":          is_weekend,
        "month":               month,
        "peak_hour":           peak_hour,
        "geo_cluster":         geo_cluster,
        "corridor_hour_freq":  corridor_hour_freq,
    }

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


# ---------------------------------------------------------------------------
# NEW — Heatmap point generation
# ---------------------------------------------------------------------------

def _cascade_severity(primary: str) -> str:
    """Return one step down from the primary severity for adjacent corridors."""
    order = ["Low", "Medium", "High", "Severe"]
    idx = order.index(primary) if primary in order else 0
    return order[max(0, idx - 1)]


def generate_heatmap_points(
    event: EventInput,
    congestion_class: str,
    affected_corridor_names: list[str],
) -> list[dict]:
    """
    Build heatmap points from the prediction result.

    Point 1 (always present): the exact event location, weighted by the
    predicted congestion class.

    Points 2–N (optional): centroids of affected corridors, weighted by one
    severity step below the primary class (cascaded impact). Corridors whose
    centroids aren't in CORRIDOR_CENTROIDS are silently skipped — no external
    data file needed.

    Returns a list of dicts matching the HeatPoint schema:
        [{"lat": float, "lng": float, "weight": float, "severity": str}, ...]
    """
    primary_weight = SEVERITY_WEIGHTS.get(congestion_class, 0.5)
    cascaded_class = _cascade_severity(congestion_class)
    cascaded_weight = SEVERITY_WEIGHTS.get(cascaded_class, primary_weight)

    points: list[dict] = [
        {
            "lat":      event.latitude,
            "lng":      event.longitude,
            "weight":   primary_weight,
            "severity": congestion_class,
        }
    ]

    for name in affected_corridor_names:
        centroid = CORRIDOR_CENTROIDS.get(name)
        if centroid is None:
            continue
        lat, lng = centroid
        # Skip if centroid coincides with the primary point (same corridor)
        if lat == event.latitude and lng == event.longitude:
            continue
        points.append(
            {
                "lat":      lat,
                "lng":      lng,
                "weight":   cascaded_weight,
                "severity": cascaded_class,
            }
        )

    return points


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict(event: EventInput) -> dict[str, Any]:
    """
    Run severity and duration inference for a single traffic event.

    Returns
    -------
    dict with keys:
        congestion_class        : str
        confidence              : float   (3 d.p.)
        duration_class          : str
        duration_estimate_range : tuple[int, int]
        heatmap_points          : list[dict]  ← NEW
    """
    artifacts = _get_artifacts()
    severity_model     = artifacts["severity_model"]
    duration_model     = artifacts["duration_model"]
    severity_label_enc = artifacts["severity_label"]
    duration_label_enc = artifacts["duration_label"]

    feature_df: pd.DataFrame = build_feature_vector(event)

    # ── Severity prediction ────────────────────────────────────────────────
    severity_proba: np.ndarray = severity_model.predict_proba(feature_df)[0]
    severity_idx: int = int(np.argmax(severity_proba))
    confidence: float = round(float(severity_proba[severity_idx]), 3)
    congestion_class: str = str(severity_label_enc.inverse_transform([severity_idx])[0])

    # ── Duration prediction ────────────────────────────────────────────────
    duration_proba: np.ndarray = duration_model.predict_proba(feature_df)[0]
    duration_idx: int = int(np.argmax(duration_proba))
    duration_class: str = str(duration_label_enc.inverse_transform([duration_idx])[0])
    duration_estimate_range: tuple[int, int] = DURATION_RANGES.get(duration_class, (0, 0))

    # ── Business rule: duration floor on road closures ─────────────────────
    DURATION_FLOOR: dict[str, str] = {"Severe": "Long", "High": "Medium"}
    floor = DURATION_FLOOR.get(congestion_class)
    duration_order = ["Short", "Medium", "Long"]
    if floor and duration_order.index(duration_class) < duration_order.index(floor):
        if event.requires_road_closure:
            duration_class = floor
            duration_estimate_range = DURATION_RANGES[duration_class]

    return {
        "congestion_class":        congestion_class,
        "confidence":              confidence,
        "duration_class":          duration_class,
        "duration_estimate_range": duration_estimate_range,
        # heatmap_points populated later in the router after affected_corridors are known
        "_raw_congestion_class":   congestion_class,  # internal — for router use
    }


def load_models() -> None:
    """Pre-warm all ML artifacts at server startup."""
    _get_artifacts()