"""
train.py
─────────
Train congestion severity + duration classifiers and serialize artifacts.

Usage:
  python train.py --data ../datasets/events.csv
  python train.py --data ../datasets/events.csv --no-save   # dry run

Outputs (written to ml/artifacts/):
  severity_model.pkl
  duration_model.pkl
  label_encoders.pkl
  feature_list.json
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, f1_score
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb

# Allow imports from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ml.feature_pipeline import ALL_FEATURES, CATEGORICAL_FEATURES, run_pipeline
from ml.preprocessing.labels import build_labels

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

LEAKAGE_COLS = [
    "id", "client_id", "created_by_id", "last_modified_by_id",
    "assigned_to_police_id", "citizen_accident_id", "closed_by_id",
    "resolved_by_id", "kgid", "gba_identifier", "veh_no",
    "status", "end_datetime", "end_address", "endlatitude", "endlongitude",
    "resolved_datetime", "resolved_at_address", "resolved_at_latitude",
    "resolved_at_longitude", "closed_datetime", "modified_datetime", "created_date",
    "address", "description", "comment", "direction", "police_station",
    "map_file", "meta_data", "route_path", "cargo_material",
    "reason_breakdown", "age_of_truck", "authenticated",
    # priority used to BUILD the label; not a feature
    "priority",
]


def load_and_clean(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df):,} rows from {csv_path}")

    # Build labels BEFORE dropping any columns
    df = build_labels(df)
    print(f"Label distribution — congestion_class:\n{df['congestion_class'].value_counts()}")
    print(f"Label distribution — duration_class:\n{df['duration_class'].value_counts()}")

    # Drop leakage / useless columns
    df = df.drop(columns=[c for c in LEAKAGE_COLS if c in df.columns], errors="ignore")
    df = df.dropna(subset=["start_datetime", "congestion_class", "duration_class"])

    return df


def time_split(df: pd.DataFrame, ratio: float = 0.8):
    df = df.sort_values("start_datetime").reset_index(drop=True)
    n = int(len(df) * ratio)
    return df.iloc[:n].copy(), df.iloc[n:].copy()


def train_classifier(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    label_name: str,
    cat_features: list[int],
) -> tuple:
    le = LabelEncoder()
    y_tr = le.fit_transform(y_train)
    y_te = le.transform(y_test)

    model = lgb.LGBMClassifier(
        objective="multiclass",
        num_class=len(le.classes_),
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )
    model.fit(X_train, y_tr, categorical_feature=cat_features)

    preds = model.predict(X_test)
    macro_f1 = f1_score(y_te, preds, average="macro")

    print(f"\n{'='*50}")
    print(f"  {label_name}")
    print(f"  Macro F1: {macro_f1:.3f}")
    print(f"{'='*50}")
    print(classification_report(y_te, preds, target_names=le.classes_))

    return model, le


def main():
    parser = argparse.ArgumentParser(description="GridMind model training")
    parser.add_argument("--data",    required=True, help="Path to events CSV")
    parser.add_argument("--no-save", action="store_true", help="Skip saving artifacts")
    args = parser.parse_args()

    # ── Load & label ──
    df = load_and_clean(args.data)

    # ── Time-based split (no data leakage) ──
    train_df, test_df = time_split(df)
    print(f"\nTrain: {len(train_df):,} rows | Test: {len(test_df):,} rows")

    # ── Feature pipeline ──
    train_df, artifacts = run_pipeline(train_df, fit=True)
    test_df, _          = run_pipeline(
        test_df,
        kmeans=artifacts["kmeans"],
        freq_map=artifacts["freq_map"],
        encoders=artifacts["categorical"],
        fit=False,
    )

    cat_idx = [ALL_FEATURES.index(c) for c in CATEGORICAL_FEATURES]

    X_train = train_df[ALL_FEATURES]
    X_test  = test_df[ALL_FEATURES]

    # ── Train models ──
    severity_model, severity_le = train_classifier(
        X_train, train_df["congestion_class"],
        X_test,  test_df["congestion_class"],
        "Congestion Class", cat_idx,
    )
    duration_model, duration_le = train_classifier(
        X_train, train_df["duration_class"],
        X_test,  test_df["duration_class"],
        "Duration Class", cat_idx,
    )

    if args.no_save:
        print("\n--no-save flag set; skipping artifact write.")
        return

    # ── Save artifacts ──
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    joblib.dump(severity_model, os.path.join(ARTIFACTS_DIR, "severity_model.pkl"))
    joblib.dump(duration_model, os.path.join(ARTIFACTS_DIR, "duration_model.pkl"))
    joblib.dump({
        **artifacts,
        "severity_label": severity_le,
        "duration_label": duration_le,
    }, os.path.join(ARTIFACTS_DIR, "label_encoders.pkl"))

    with open(os.path.join(ARTIFACTS_DIR, "feature_list.json"), "w") as f:
        json.dump({"features": ALL_FEATURES, "categorical": CATEGORICAL_FEATURES}, f, indent=2)

    print(f"\n✅ Artifacts saved to {ARTIFACTS_DIR}/")
    print("   severity_model.pkl")
    print("   duration_model.pkl")
    print("   label_encoders.pkl")
    print("   feature_list.json")

    # Copy artifacts to backend for immediate use
    backend_ml = os.path.join(
        os.path.dirname(__file__), "..", "backend", "app", "models", "ml"
    )
    os.makedirs(backend_ml, exist_ok=True)
    for fname in ["severity_model.pkl", "duration_model.pkl", "label_encoders.pkl"]:
        src = os.path.join(ARTIFACTS_DIR, fname)
        dst = os.path.join(backend_ml, fname)
        import shutil
        shutil.copy2(src, dst)
    print(f"\n✅ Artifacts also copied to {backend_ml}/")


if __name__ == "__main__":
    main()
