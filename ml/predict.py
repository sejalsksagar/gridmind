"""
predict.py
───────────
Standalone inference script for testing trained models outside FastAPI.
Also used to verify artifact quality before the integration day.

Usage:
  python predict.py                                  # runs all demo scenarios
  python predict.py --scenario tumkur_severe         # run one scenario
  python predict.py --json '{"event_cause": ...}'   # raw JSON input
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from ml.feature_pipeline import ALL_FEATURES, CATEGORICAL_FEATURES

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
IST = timezone(timedelta(hours=5, minutes=30))

DEMO_SCENARIOS = {
    "tumkur_severe": {
        "event_type": "unplanned", "event_cause": "construction",
        "latitude": 13.040004,     "longitude": 77.518099,
        "requires_road_closure": True, "corridor": "Tumkur Road",
        "start_datetime": "2024-06-01T18:00:00+05:30", "veh_type": "heavy_vehicle",
    },
    "mysore_medium": {
        "event_type": "unplanned", "event_cause": "vehicle_breakdown",
        "latitude": 12.940000,     "longitude": 77.540000,
        "requires_road_closure": False, "corridor": "Mysore Road",
        "start_datetime": "2024-06-01T14:00:00+05:30", "veh_type": "truck",
    },
    "side_road_low": {
        "event_type": "unplanned", "event_cause": "pot_holes",
        "latitude": 12.950000,     "longitude": 77.590000,
        "requires_road_closure": False, "corridor": "Non-corridor",
        "start_datetime": "2024-06-01T14:00:00+05:30", "veh_type": "Unknown",
    },
    "hosur_high": {
        "event_type": "unplanned", "event_cause": "accident",
        "latitude": 12.910000,     "longitude": 77.620000,
        "requires_road_closure": False, "corridor": "Hosur Road",
        "start_datetime": "2024-06-01T08:00:00+05:30", "veh_type": "private_car",
    },
}


def load_artifacts():
    sev_model = joblib.load(os.path.join(ARTIFACTS_DIR, "severity_model.pkl"))
    dur_model = joblib.load(os.path.join(ARTIFACTS_DIR, "duration_model.pkl"))
    artifacts = joblib.load(os.path.join(ARTIFACTS_DIR, "label_encoders.pkl"))
    return sev_model, dur_model, artifacts


def build_row(event: dict, artifacts: dict) -> pd.DataFrame:
    dt = datetime.fromisoformat(event["start_datetime"]).astimezone(IST)
    hour    = dt.hour
    weekday = dt.weekday()
    month   = dt.month
    is_weekend = int(weekday >= 5)
    peak_hour  = int(8 <= hour <= 11 or 17 <= hour <= 20)

    kmeans   = artifacts["kmeans"]
    freq_map = artifacts["freq_map"]
    corridor = event.get("corridor", "Non-corridor")

    geo_cluster        = int(kmeans.predict([[event["latitude"], event["longitude"]]])[0])
    corridor_hour_freq = float(freq_map.get((corridor, hour), 0))

    row = {
        "event_type":           event.get("event_type", "unplanned"),
        "event_cause":          event["event_cause"],
        "veh_type":             event.get("veh_type", "Unknown"),
        "corridor":             corridor,
        "latitude":             event["latitude"],
        "longitude":            event["longitude"],
        "requires_road_closure": int(event.get("requires_road_closure", False)),
        "hour": hour, "weekday": weekday, "is_weekend": is_weekend,
        "month": month, "peak_hour": peak_hour,
        "geo_cluster": geo_cluster, "corridor_hour_freq": corridor_hour_freq,
    }

    df = pd.DataFrame([row])
    cat_enc = artifacts["categorical"]
    for col in CATEGORICAL_FEATURES:
        le  = cat_enc[col]
        val = df[col].iloc[0]
        if val not in set(le.classes_):
            val = "__unseen__"
        df[col] = le.transform([val])

    return df[ALL_FEATURES]


def run_inference(event: dict) -> dict:
    sev_model, dur_model, artifacts = load_artifacts()
    fv = build_row(event, artifacts)

    sev_proba = sev_model.predict_proba(fv)[0]
    sev_idx   = int(np.argmax(sev_proba))
    sev_class = artifacts["severity_label"].inverse_transform([sev_idx])[0]
    confidence = float(sev_proba[sev_idx])

    dur_proba = dur_model.predict_proba(fv)[0]
    dur_idx   = int(np.argmax(dur_proba))
    dur_class = artifacts["duration_label"].inverse_transform([dur_idx])[0]

    return {
        "congestion_class":       sev_class,
        "confidence":             round(confidence, 3),
        "duration_class":         dur_class,
        "all_severity_probs":     dict(zip(
            artifacts["severity_label"].classes_,
            [round(float(p), 3) for p in sev_proba],
        )),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=None, choices=list(DEMO_SCENARIOS))
    parser.add_argument("--json",     default=None, help="Raw JSON event string")
    parser.add_argument("--all",      action="store_true", help="Run all demo scenarios")
    args = parser.parse_args()

    if not os.path.exists(os.path.join(ARTIFACTS_DIR, "severity_model.pkl")):
        print("❌ No artifacts found. Run: python train.py --data <csv_path>")
        sys.exit(1)

    scenarios_to_run = {}

    if args.json:
        scenarios_to_run["custom"] = json.loads(args.json)
    elif args.scenario:
        scenarios_to_run[args.scenario] = DEMO_SCENARIOS[args.scenario]
    else:
        scenarios_to_run = DEMO_SCENARIOS

    print("\n" + "="*60)
    print("GridMind — Inference Test")
    print("="*60)

    for name, event in scenarios_to_run.items():
        result = run_inference(event)
        status = "✅" if name.endswith("severe") and result["congestion_class"] == "Severe" else "ℹ️"
        print(f"\n{status} Scenario: {name}")
        print(f"   Cause:       {event['event_cause']}")
        print(f"   Closure:     {event.get('requires_road_closure', False)}")
        print(f"   Corridor:    {event.get('corridor', 'Unknown')}")
        print(f"   Hour:        {event['start_datetime'][11:16]}")
        print(f"   → Severity:  {result['congestion_class']}  ({result['confidence']*100:.0f}% confidence)")
        print(f"   → Duration:  {result['duration_class']}")
        print(f"   → Probs:     {result['all_severity_probs']}")

    print("\n" + "="*60)


if __name__ == "__main__":
    main()
