"""
Prediction Service
──────────────────
Loads LightGBM models from ml/artifacts/ at startup.
Falls back to rule-based mock when USE_MOCK_MODELS=true (default during dev).

Dev 1 owns this file after Day 3 integration.
Until pkl files exist, USE_MOCK_MODELS=true keeps the API fully functional.
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from functools import lru_cache

from app.schemas import EventInput, CongestionClass, DurationClass

IST = timezone(timedelta(hours=5, minutes=30))

FEATURES = [
    "event_type", "event_cause", "veh_type", "corridor",
    "latitude", "longitude", "requires_road_closure",
    "hour", "weekday", "is_weekend", "month", "peak_hour",
    "geo_cluster", "corridor_hour_freq",
]

DURATION_RANGES: dict[str, tuple[int, int]] = {
    "Short": (5, 30),
    "Medium": (30, 120),
    "Long": (120, 240),
}

# ─── Mock rule-based fallback ─────────────────────────────────────────────────

HIGH_IMPACT_CAUSES = {
    "accident", "tree_fall", "construction", "public_event",
    "vip_movement", "protest", "procession",
}

def _mock_predict(event: EventInput) -> dict:
    """Rule-based prediction used when USE_MOCK_MODELS=true."""
    score = 0
    score += 3 if event.requires_road_closure else 0
    score += 1 if event.event_cause.value in HIGH_IMPACT_CAUSES else 0
    score += 1 if event.corridor.lower() != "non-corridor" else 0

    dt = datetime.fromisoformat(event.start_datetime).astimezone(IST)
    hour = dt.hour
    is_peak = 8 <= hour <= 11 or 17 <= hour <= 20
    score += 1 if is_peak else 0

    if score <= 1:
        sev, conf = "Low", 0.82
    elif score <= 3:
        sev, conf = "Medium", 0.78
    elif score <= 5:
        sev, conf = "High", 0.85
    else:
        sev, conf = "Severe", 0.91

    dur = "Long" if score >= 5 else "Medium" if score >= 3 else "Short"

    return {
        "congestion_class": sev,
        "confidence": conf,
        "duration_class": dur,
        "duration_estimate_range": DURATION_RANGES[dur],
    }


# ─── Real model loading ───────────────────────────────────────────────────────

ARTIFACTS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "models", "ml"
)

@lru_cache(maxsize=1)
def _load_models():
    """Load pkl files once; cached for process lifetime."""
    import joblib
    sev_model = joblib.load(os.path.join(ARTIFACTS_DIR, "severity_model.pkl"))
    dur_model = joblib.load(os.path.join(ARTIFACTS_DIR, "duration_model.pkl"))
    artifacts = joblib.load(os.path.join(ARTIFACTS_DIR, "label_encoders.pkl"))
    return sev_model, dur_model, artifacts


def _build_feature_vector(event: EventInput) -> pd.DataFrame:
    _, _, artifacts = _load_models()
    dt = datetime.fromisoformat(event.start_datetime).astimezone(IST)
    hour = dt.hour
    weekday = dt.weekday()
    month = dt.month
    is_weekend = int(weekday >= 5)
    peak_hour = int(8 <= hour <= 11 or 17 <= hour <= 20)

    kmeans = artifacts["kmeans"]
    freq_map = artifacts["freq_map"]

    coords = np.array([[event.latitude, event.longitude]])
    geo_cluster = int(kmeans.predict(coords)[0])

    corridor = event.corridor or "Non-corridor"
    corridor_hour_freq = float(freq_map.get((corridor, hour), 0))

    row = {
        "event_type": event.event_type.value,
        "event_cause": event.event_cause.value,
        "veh_type": event.veh_type.value if event.veh_type else "Unknown",
        "corridor": corridor,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "requires_road_closure": int(event.requires_road_closure),
        "hour": hour,
        "weekday": weekday,
        "is_weekend": is_weekend,
        "month": month,
        "peak_hour": peak_hour,
        "geo_cluster": geo_cluster,
        "corridor_hour_freq": corridor_hour_freq,
    }

    df = pd.DataFrame([row])
    cat_encoders = artifacts["categorical"]
    for col in ["event_type", "event_cause", "veh_type", "corridor"]:
        le = cat_encoders[col]
        val = df[col].iloc[0]
        if val not in set(le.classes_):
            val = "__unseen__"
        df[col] = le.transform([val])

    return df[FEATURES]


def _real_predict(event: EventInput) -> dict:
    sev_model, dur_model, artifacts = _load_models()
    sev_le = artifacts["severity_label"]
    dur_le = artifacts["duration_label"]

    fv = _build_feature_vector(event)

    sev_proba = sev_model.predict_proba(fv)[0]
    sev_idx = int(np.argmax(sev_proba))
    sev_class = sev_le.inverse_transform([sev_idx])[0]
    confidence = float(sev_proba[sev_idx])

    dur_proba = dur_model.predict_proba(fv)[0]
    dur_idx = int(np.argmax(dur_proba))
    dur_class = dur_le.inverse_transform([dur_idx])[0]

    return {
        "congestion_class": sev_class,
        "confidence": round(confidence, 3),
        "duration_class": dur_class,
        "duration_estimate_range": DURATION_RANGES[dur_class],
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def models_available() -> bool:
    """True if real pkl files are present on disk."""
    return all(
        os.path.exists(os.path.join(ARTIFACTS_DIR, f))
        for f in ["severity_model.pkl", "duration_model.pkl", "label_encoders.pkl"]
    )


def predict(event: EventInput, use_mock: bool = False) -> dict:
    if use_mock or not models_available():
        return _mock_predict(event)
    return _real_predict(event)
