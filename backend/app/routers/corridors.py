"""
app/routers/corridors.py

Endpoints:
  GET /api/v1/corridors/geojson  – returns Bengaluru corridors GeoJSON,
                                   optionally coloured by a severity map.
  GET /api/v1/corridors/list     – returns the canonical list of corridor names.
"""

from __future__ import annotations

import copy
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level cache – loaded once at import time
# ---------------------------------------------------------------------------

_DATA_PATH = Path(__file__).parent.parent / "data" / "bengaluru_corridors.geojson"

def _load_geojson() -> Dict[str, Any]:
    try:
        with _DATA_PATH.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        logger.warning("bengaluru_corridors.geojson not found at %s", _DATA_PATH)
        return {"type": "FeatureCollection", "features": []}
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse bengaluru_corridors.geojson: %s", exc)
        return {"type": "FeatureCollection", "features": []}

_GEOJSON_CACHE: Dict[str, Any] = _load_geojson()

# ---------------------------------------------------------------------------
# Severity → visual property mappings
# ---------------------------------------------------------------------------

_SEVERITY_COLOR: Dict[str, str] = {
    "Low":    "#22C55E",
    "Medium": "#F59E0B",
    "High":   "#EF4444",
    "Severe": "#7F1D1D",
}

_SEVERITY_WEIGHT: Dict[str, int] = {
    "Low":    2,
    "Medium": 3,
    "High":   5,
    "Severe": 7,
}

_SEVERITY_OPACITY: Dict[str, float] = {
    "Low":    0.5,
    "Medium": 0.6,
    "High":   0.75,
    "Severe": 0.9,
}

_DEFAULT_COLOR   = "#6B7280"
_DEFAULT_WEIGHT  = 2
_DEFAULT_OPACITY = 0.4

# ---------------------------------------------------------------------------
# Hardcoded corridor list
# ---------------------------------------------------------------------------

_CORRIDOR_NAMES: list[str] = [
    "Tumkur Road",
    "Mysore Road",
    "Hosur Road",
    "Bellary Road 1",
    "Bellary Road 2",
    "ORR East 1",
    "ORR East 2",
    "ORR North 1",
    "ORR North 2",
    "Old Madras Road",
    "Magadi Road",
    "Bannerghatta Road",
    "West of Chord Road",
    "Non-corridor",
]

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/corridors",
    tags=["Corridors"]
)


@router.get("/geojson", summary="Return corridors GeoJSON with optional severity overlay")
def get_corridors_geojson(
    severity_map: Optional[str] = Query(
        default=None,
        description=(
            'JSON string mapping corridor name → severity level. '
            'Example: \'{"Tumkur Road": "Severe", "Mysore Road": "High"}\''
        ),
    )
) -> Dict[str, Any]:
    """
    Returns the Bengaluru corridors as a GeoJSON FeatureCollection.

    Each feature's `properties` is augmented with:
    - `severity`  – the severity label (if provided)
    - `color`     – hex colour string
    - `weight`    – polyline stroke weight
    - `opacity`   – polyline stroke opacity
    """
    # Parse optional severity_map
    parsed_severity: Dict[str, str] = {}
    if severity_map:
        try:
            parsed_severity = json.loads(severity_map)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=422,
                detail="severity_map must be a valid JSON string, e.g. '{\"Tumkur Road\": \"Severe\"}'",
            )
        if not isinstance(parsed_severity, dict):
            raise HTTPException(
                status_code=422,
                detail="severity_map must decode to a JSON object (dict).",
            )

    # Deep-copy so the module-level cache is never mutated
    geojson = copy.deepcopy(_GEOJSON_CACHE)

    for feature in geojson.get("features", []):
        props: Dict[str, Any] = feature.setdefault("properties", {})

        # Determine corridor name – try common property keys
        corridor_name: str = (
            props.get("name")
            or props.get("corridor")
            or props.get("corridor_name")
            or ""
        )

        severity = parsed_severity.get(corridor_name)
        if severity and severity in _SEVERITY_COLOR:
            props["severity"] = severity
            props["color"]    = _SEVERITY_COLOR[severity]
            props["weight"]   = _SEVERITY_WEIGHT[severity]
            props["opacity"]  = _SEVERITY_OPACITY[severity]
        else:
            props["color"]   = _DEFAULT_COLOR
            props["weight"]  = _DEFAULT_WEIGHT
            props["opacity"] = _DEFAULT_OPACITY

    return geojson


@router.get("/list", summary="Return the canonical list of corridor names")
def list_corridors() -> Dict[str, list[str]]:
    """Returns all valid corridor names used in the GridMind model."""
    return {"corridors": _CORRIDOR_NAMES}