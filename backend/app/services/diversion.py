"""
Service layer for fetching diversion routes from the MapmyIndia (Mappls)
Directions API.

Handles:
    - Calling the Mappls route_adv driving endpoint
    - Decoding the returned encoded polyline geometry
    - In-memory caching of results for the duration of the demo
"""

from __future__ import annotations

import httpx
import polyline
from fastapi import HTTPException

from app.core.config import settings

DIVERSION_EXITS = {
    # toward Hebbal/Yeshwanthpur side
    "Tumkur Road": (13.025, 77.575),

    # toward ORR East
    "Bellary Road 1": (13.020, 77.655),

    # toward city center
    "Magadi Road": (12.965, 77.555),
}

# Mappls "route_adv" directions endpoint (works with access_token query param,
# unlike the older /{API_KEY}/route_adv/... path-based form).
MAPPLS_DIRECTIONS_URL = (
    "https://route.mappls.com/route/direction/route_adv/driving/"
    "{from_lng},{from_lat};{to_lng},{to_lat}"
)

REQUEST_TIMEOUT_SECONDS = 10.0

# Module-level in-memory cache: "from_lat,from_lng,to_lat,to_lng" -> result dict.
# This avoids re-calling the Directions API repeatedly during a live demo.
_route_cache: dict[str, dict] = {}


def _cache_key(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> str:
    return f"{from_lat},{from_lng},{to_lat},{to_lng}"


def _build_summary(distance_m: int, duration_s: int) -> str:
    km = distance_m / 1000
    mins = round(duration_s / 60)
    return f"Diversion route — {km:.1f} km, ~{mins} min"


async def get_diversion_route(
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
    corridor: str | None = None,
) -> dict:
    """
    Fetch a driving route between two points from the Mappls Directions API.

    Returns:
        {
            "route_coordinates": [[lat, lng], ...],
            "total_distance_m": int,
            "total_duration_s": int,
            "summary": str,
        }

    Raises:
        HTTPException(503): if the Directions API cannot be reached or errors out.
    """

    if corridor in DIVERSION_EXITS:
        to_lat, to_lng = DIVERSION_EXITS[corridor]

    key = _cache_key(from_lat, from_lng, to_lat, to_lng)
    if key in _route_cache:
        return _route_cache[key]

    url = MAPPLS_DIRECTIONS_URL.format(
        from_lng=from_lng, from_lat=from_lat, to_lng=to_lng, to_lat=to_lat
    )
    params = {"access_token": settings.MAPPLS_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Directions API unavailable")

    try:
        route = data["routes"][0]
        encoded_geometry = route["geometry"]
        distance_m = int(route["distance"])
        duration_s = int(route["duration"])
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=503, detail="Directions API unavailable")

    decoded_coords = polyline.decode(encoded_geometry)  # [(lat, lng), ...]
    route_coordinates = [[lat, lng] for lat, lng in decoded_coords]

    result = {
        "route_coordinates": route_coordinates,
        "total_distance_m": distance_m,
        "total_duration_s": duration_s,
        "summary": _build_summary(distance_m, duration_s),
    }

    _route_cache[key] = result
    return result