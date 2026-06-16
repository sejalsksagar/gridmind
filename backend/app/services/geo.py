"""
GeoJSON Service
───────────────
Reads pre-built corridor GeoJSON and enriches features with severity colors.
Dev 2 builds the static GeoJSON file; this service serves it.
"""

import json
import os
from app.schemas import CongestionClass

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "demo_data")

SEVERITY_COLORS: dict[str, str] = {
    "Low":    "#22C55E",
    "Medium": "#F59E0B",
    "High":   "#EF4444",
    "Severe": "#7F1D1D",
}

SEVERITY_WEIGHT: dict[str, int] = {
    "Low": 3, "Medium": 5, "High": 7, "Severe": 10,
}


def _load_corridors_geojson() -> dict:
    path = os.path.join(DATA_DIR, "bengaluru_corridors.geojson")
    with open(path) as f:
        return json.load(f)


def get_corridors(
    corridor_names: list[str] | None = None,
    severity: str | None = None,
) -> dict:
    """Return GeoJSON FeatureCollection optionally filtered by corridor names."""
    raw = _load_corridors_geojson()
    features = raw.get("features", [])

    if corridor_names:
        features = [
            f for f in features
            if f.get("properties", {}).get("name") in corridor_names
        ]

    # Inject severity color if provided
    for feature in features:
        props = feature.setdefault("properties", {})
        sev = severity or props.get("default_severity", "Low")
        props["severity"] = sev
        props["color"] = SEVERITY_COLORS.get(sev, "#22C55E")
        props["weight"] = SEVERITY_WEIGHT.get(sev, 3)
        props["opacity"] = 0.85

    return {"type": "FeatureCollection", "features": features}


def get_corridors_colored(
    affected: list[dict],
) -> dict:
    """
    Given a list of AffectedCorridor dicts (from prediction),
    return a GeoJSON FeatureCollection with severity-colored lines.
    """
    raw = _load_corridors_geojson()
    severity_map = {a["name"]: a["severity"] for a in affected}

    colored_features = []
    for feature in raw.get("features", []):
        name = feature.get("properties", {}).get("name")
        sev = severity_map.get(name, "Low")
        f = dict(feature)
        f["properties"] = {
            **feature.get("properties", {}),
            "severity": sev,
            "color": SEVERITY_COLORS[sev],
            "weight": SEVERITY_WEIGHT[sev],
            "opacity": 0.85,
            "estimated_delay_minutes": next(
                (a["estimated_delay_minutes"] for a in affected if a["name"] == name), 0
            ),
        }
        colored_features.append(f)

    return {"type": "FeatureCollection", "features": colored_features}


def get_corridor_list() -> list[str]:
    raw = _load_corridors_geojson()
    return [
        f["properties"]["name"]
        for f in raw.get("features", [])
        if "properties" in f and "name" in f["properties"]
    ]


def get_heatpoints(severity: str | None = None, limit: int = 200) -> dict:
    """Return point features for the heatmap layer."""
    path = os.path.join(DATA_DIR, "heatpoints.geojson")
    if not os.path.exists(path):
        return {"type": "FeatureCollection", "features": []}

    with open(path) as f:
        raw = json.load(f)

    features = raw.get("features", [])
    if severity:
        features = [
            f for f in features
            if f.get("properties", {}).get("severity") == severity
        ]

    return {"type": "FeatureCollection", "features": features[:limit]}
