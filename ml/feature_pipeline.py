"""
feature_pipeline.py
────────────────────
All feature construction logic in one place.
Imported by both train.py and predict.py so transformations are never duplicated.
"""

import numpy as np
import pandas as pd
from datetime import timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

CATEGORICAL_FEATURES = ["event_type", "event_cause", "veh_type", "corridor"]
NUMERIC_FEATURES = [
    "latitude", "longitude", "requires_road_closure",
    "hour", "weekday", "is_weekend", "month", "peak_hour",
    "geo_cluster", "corridor_hour_freq",
]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# Causes associated with higher traffic impact
HIGH_IMPACT_CAUSES = {
    "accident", "tree_fall", "construction", "public_event",
    "vip_movement", "protest", "procession", "debris",
}


# ─── Time Features ─────────────────────────────────────────────────────────────

def add_time_features(df: pd.DataFrame, datetime_col: str = "start_datetime") -> pd.DataFrame:
    """Extract IST-adjusted temporal features from a datetime column."""
    # Ensure UTC-aware, then shift to IST
    dt = pd.to_datetime(df[datetime_col], utc=True)
    local = dt + pd.Timedelta(hours=5, minutes=30)

    df = df.copy()
    df["hour"]       = local.dt.hour
    df["weekday"]    = local.dt.dayofweek          # 0=Mon, 6=Sun
    df["month"]      = local.dt.month
    df["is_weekend"] = (df["weekday"] >= 5).astype(int)

    morning = df["hour"].between(8, 11)
    evening = df["hour"].between(17, 20)
    df["peak_hour"] = (morning | evening).astype(int)

    return df


# ─── Geo Clustering ─────────────────────────────────────────────────────────────

def fit_geo_clusters(df: pd.DataFrame, n_clusters: int = 25):
    """Fit KMeans on lat/lon and return fitted model."""
    from sklearn.cluster import KMeans
    coords = df[["latitude", "longitude"]].fillna(0)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(coords)
    return kmeans


def add_geo_cluster(df: pd.DataFrame, kmeans) -> pd.DataFrame:
    df = df.copy()
    coords = df[["latitude", "longitude"]].fillna(0)
    df["geo_cluster"] = kmeans.predict(coords)
    return df


# ─── Historical Frequency ──────────────────────────────────────────────────────

def build_freq_map(df: pd.DataFrame) -> pd.Series:
    """Count of past events per (corridor, hour) — used as a congestion-proneness proxy."""
    return df.groupby(["corridor", "hour"]).size()


def add_corridor_freq(df: pd.DataFrame, freq_map: pd.Series) -> pd.DataFrame:
    df = df.copy()
    df = df.merge(
        freq_map.rename("corridor_hour_freq"),
        left_on=["corridor", "hour"],
        right_index=True,
        how="left",
    )
    df["corridor_hour_freq"] = df["corridor_hour_freq"].fillna(0)
    return df


# ─── Missing Values ────────────────────────────────────────────────────────────

def fill_missing_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in CATEGORICAL_FEATURES:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown").astype(str)
    return df


# ─── Label Encoding ────────────────────────────────────────────────────────────

def fit_label_encoders(df: pd.DataFrame) -> dict:
    from sklearn.preprocessing import LabelEncoder
    encoders = {}
    for col in CATEGORICAL_FEATURES:
        le = LabelEncoder()
        le.fit(list(df[col].unique()) + ["__unseen__"])
        encoders[col] = le
    return encoders


def apply_label_encoders(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    df = df.copy()
    for col, le in encoders.items():
        known = set(le.classes_)
        df[col] = df[col].apply(lambda v: v if v in known else "__unseen__")
        df[col] = le.transform(df[col])
    return df


# ─── Full Pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(
    df: pd.DataFrame,
    kmeans=None,
    freq_map=None,
    encoders=None,
    fit: bool = True,
) -> tuple[pd.DataFrame, dict]:
    """
    Run the full feature pipeline.

    fit=True  → fit all transformers (training mode). Returns artifacts.
    fit=False → use provided transformers (inference mode).

    Returns: (transformed_df, artifacts_dict)
    """
    df = add_time_features(df)
    df = fill_missing_categoricals(df)

    if fit:
        kmeans   = fit_geo_clusters(df)
        freq_map = build_freq_map(df)
        encoders = fit_label_encoders(df)

    df = add_geo_cluster(df, kmeans)
    df = add_corridor_freq(df, freq_map)
    df = apply_label_encoders(df, encoders)

    artifacts = {"kmeans": kmeans, "freq_map": freq_map, "categorical": encoders}
    return df, artifacts
