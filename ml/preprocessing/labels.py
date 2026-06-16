"""
preprocessing/labels.py
────────────────────────
Derives congestion_class and duration_class from raw event data.
These are weak-supervision labels built from operational rules
because the dataset has no ground-truth congestion measure.
"""

import numpy as np
import pandas as pd

HIGH_IMPACT_CAUSES = {
    "accident", "tree_fall", "construction", "public_event",
    "vip_movement", "protest", "procession", "Debris", "debris",
}


def build_duration_label(df: pd.DataFrame) -> pd.Series:
    """
    Duration class from closed_datetime - start_datetime (minutes).
    Clips extreme outliers (stale tickets) and imputes missing values
    from per-cause medians.
    """
    dur_min = (
        pd.to_datetime(df["closed_datetime"], utc=True, errors="coerce")
        - pd.to_datetime(df["start_datetime"], utc=True, errors="coerce")
    ).dt.total_seconds() / 60

    # Clip to plausible window; beyond 720 min = data quality issue
    dur_min = dur_min.where((dur_min >= 0) & (dur_min <= 720))

    # Impute from per-cause median, fall back to overall median
    cause_median = dur_min.groupby(df["event_cause"]).median()
    overall_median = dur_min.median()
    dur_min = dur_min.fillna(df["event_cause"].map(cause_median)).fillna(overall_median)

    bins   = [-1, 30, 120, np.inf]
    labels = ["Short", "Medium", "Long"]
    return pd.cut(dur_min, bins=bins, labels=labels)


def build_severity_label(df: pd.DataFrame) -> pd.Series:
    """
    Composite congestion severity score → {Low, Medium, High, Severe}.

    Score (0–7):
      +3  requires_road_closure == True
      +2  priority == 'High'
      +1  event_cause is high-impact
      +1  corridor is a named arterial (not 'Non-corridor')
      +1  duration_class == 'Long'
    """
    score = pd.Series(0, index=df.index, dtype=int)
    score += df["requires_road_closure"].astype(bool).astype(int) * 3
    score += (df.get("priority", pd.Series("Low", index=df.index)) == "High").astype(int) * 2
    score += df["event_cause"].isin(HIGH_IMPACT_CAUSES).astype(int)
    score += (df["corridor"].fillna("Non-corridor").str.lower() != "non-corridor").astype(int)

    # Add duration_class contribution if column exists
    if "duration_class" in df.columns:
        score += (df["duration_class"] == "Long").astype(int)
    else:
        dur = build_duration_label(df)
        score += (dur == "Long").astype(int)

    bins   = [-1, 1, 3, 5, 7]
    labels = ["Low", "Medium", "High", "Severe"]
    return pd.cut(score, bins=bins, labels=labels)


def build_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Attach both label columns to a copy of df."""
    df = df.copy()
    df["duration_class"]  = build_duration_label(df)
    df["congestion_class"] = build_severity_label(df)
    return df
