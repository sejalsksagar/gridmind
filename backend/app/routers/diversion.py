"""
Router for the diversion route endpoint.

POST /diversion -> calls the Mappls Directions API (via app.services.diversion)
and returns a decoded route. Falls back to a hardcoded linear-interpolation
route if MAPPLS_API_KEY is not configured (e.g. local/demo environments).
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.diversion import (
    DIVERSION_EXITS,
    get_diversion_route,
)

router = APIRouter()


class DiversionRequest(BaseModel):
    from_lat: float = Field(ge=12.7, le=13.3)
    from_lng: float = Field(ge=77.3, le=78.0)
    to_lat: float
    to_lng: float
    corridor: str | None = None


class DiversionResponse(BaseModel):
    route_coordinates: list[list[float]]
    total_distance_m: int
    total_duration_s: int
    summary: str


def _haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Rough straight-line distance in meters, used only for the demo fallback."""
    from math import asin, cos, radians, sin, sqrt

    r = 6371000  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lng2 - lng1)
    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    return int(2 * r * asin(sqrt(a)))


def _build_fallback_route(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> DiversionResponse:
    """
    Hardcoded fallback: 5 waypoints linearly interpolated between the
    from/to points. Used when no MAPPLS_API_KEY is configured.
    """
    num_points = 5
    route_coordinates = [
        [
            from_lat + (to_lat - from_lat) * i / (num_points - 1),
            from_lng + (to_lng - from_lng) * i / (num_points - 1),
        ]
        for i in range(num_points)
    ]

    distance_m = _haversine_distance_m(from_lat, from_lng, to_lat, to_lng)
    # Assume an average urban speed of ~30 km/h for the demo duration estimate.
    duration_s = int(distance_m / (30 * 1000 / 3600))

    return DiversionResponse(
        route_coordinates=route_coordinates,
        total_distance_m=distance_m,
        total_duration_s=duration_s,
        summary="Demo fallback route (API key not configured)",
    )


@router.post("/diversion", response_model=DiversionResponse)
async def diversion_route(payload: DiversionRequest) -> DiversionResponse:
    to_lat = payload.to_lat
    to_lng = payload.to_lng

    if payload.corridor in DIVERSION_EXITS:
        to_lat, to_lng = DIVERSION_EXITS[payload.corridor]
    if not settings.MAPPLS_API_KEY:
        return _build_fallback_route(
            payload.from_lat, payload.from_lng, payload.to_lat, payload.to_lng
        )

    result = await get_diversion_route(
        from_lat=payload.from_lat,
        from_lng=payload.from_lng,
        to_lat=payload.to_lat,
        to_lng=payload.to_lng,
        corridor=payload.corridor,
    )
    return DiversionResponse(**result)