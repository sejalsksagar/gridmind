"""
inference/runner.py
────────────────────
Clean inference interface used by app/services/prediction.py.
Keeps backend independent of training code internals.
"""

import os
import numpy as np
import pandas as pd
from functools import lru_cache
from datetime import timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")

FEATURES = [
    "event_type", "event_cause", "veh_type", "corridor",
    "latitude", "longitude", "requires_road_closure",
    "hour", "weekday", "is_weekend", "month", "peak_hour",
    "geo_cluster", "corridor_hour_freq",
]
CATEGORICAL_FEATURES = ["event_type", "event_cause", "veh_type", "corridor"]


@lru_cache(maxsize=1)
def load_artifacts():
    import joblib
    sev = joblib.load(os.path.join(ARTIFACTS_DIR, "severity_model.pkl"))
    dur = joblib.load(os.path.join(ARTIFACTS_DIR, "duration_model.pkl"))
    enc = joblib.load(os.path.join(ARTIFACTS_DIR, "label_encoders.pkl"))
    return sev, dur, enc


def is_ready() -> bool:
    return all(
        os.path.exists(os.path.join(ARTIFACTS_DIR, f))
        for f in ["severity_model.pkl", "duration_model.pkl", "label_encoders.pkl"]
    )


def predict(event_dict: dict) -> dict:
    """
    Accepts a flat dict of event fields.
    Returns congestion_class, confidence, duration_class.
    """
    sev_model, dur_model, artifacts = load_artifacts()
    dt = __import__("datetime").datetime.fromisoformat(
        event_dict["start_datetime"]
    ).astimezone(IST)

    hour, weekday, month = dt.hour, dt.weekday(), dt.month
    is_weekend = int(weekday >= 5)
    peak_hour  = int(8 <= hour <= 11 or 17 <= hour <= 20)
    corridor   = event_dict.get("corridor", "Non-corridor")

    geo_cluster = int(
        artifacts["kmeans"].predict([[event_dict["latitude"], event_dict["longitude"]]])[0]
    )
    corridor_hour_freq = float(artifacts["freq_map"].get((corridor, hour), 0))

    row = {
        "event_type":             event_dict.get("event_type", "unplanned"),
        "event_cause":            event_dict["event_cause"],
        "veh_type":               event_dict.get("veh_type", "Unknown"),
        "corridor":               corridor,
        "latitude":               event_dict["latitude"],
        "longitude":              event_dict["longitude"],
        "requires_road_closure":  int(event_dict.get("requires_road_closure", False)),
        "hour": hour, "weekday": weekday, "is_weekend": is_weekend,
        "month": month, "peak_hour": peak_hour,
        "geo_cluster": geo_cluster, "corridor_hour_freq": corridor_hour_freq,
    }

    df = pd.DataFrame([row])
    for col in CATEGORICAL_FEATURES:
        le  = artifacts["categorical"][col]
        val = df[col].iloc[0]
        if val not in set(le.classes_):
            val = "__unseen__"
        df[col] = le.transform([val])

    fv = df[FEATURES]
    sev_proba  = sev_model.predict_proba(fv)[0]
    sev_idx    = int(np.argmax(sev_proba))
    sev_class  = artifacts["severity_label"].inverse_transform([sev_idx])[0]

    dur_proba  = dur_model.predict_proba(fv)[0]
    dur_idx    = int(np.argmax(dur_proba))
    dur_class  = artifacts["duration_label"].inverse_transform([dur_idx])[0]

    return {
        "congestion_class": sev_class,
        "confidence":       round(float(sev_proba[sev_idx]), 3),
        "duration_class":   dur_class,
    }
