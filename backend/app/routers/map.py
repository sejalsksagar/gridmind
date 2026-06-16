from fastapi import APIRouter, Query, HTTPException
from app.services import geo as geo_svc

router = APIRouter(prefix="/map", tags=["Map"])


@router.get("/corridors")
def get_corridors(
    corridors: str | None = Query(None, description="Comma-separated corridor names"),
    severity: str | None = Query(None, description="Color all returned features this severity"),
):
    """
    Return GeoJSON FeatureCollection of Bengaluru corridors.
    Optionally filter by corridor name list and apply severity coloring.
    """
    try:
        names = [c.strip() for c in corridors.split(",")] if corridors else None
        return geo_svc.get_corridors(corridor_names=names, severity=severity)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Corridor GeoJSON not found. Add demo_data/bengaluru_corridors.geojson."
        )


@router.get("/corridors/list")
def list_corridors() -> dict:
    """Return all valid corridor names for the frontend dropdown."""
    try:
        return {"corridors": geo_svc.get_corridor_list()}
    except FileNotFoundError:
        # Return hardcoded list if GeoJSON not yet available
        return {"corridors": [
            "Tumkur Road", "Mysore Road", "Hosur Road", "Bellary Road 1",
            "Bellary Road 2", "ORR East 1", "ORR East 2", "ORR North 1",
            "ORR North 2", "ORR West 1", "Old Madras Road", "Magadi Road",
            "Bannerghatta Road", "Kanakapura Road", "Non-corridor",
        ]}


@router.get("/heatpoints")
def get_heatpoints(
    severity: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
):
    """Return weighted point features for Leaflet heatmap layer."""
    return geo_svc.get_heatpoints(severity=severity, limit=limit)


@router.post("/corridors/colored")
def get_colored_corridors(affected_corridors: list[dict]):
    """
    Given a list of AffectedCorridor objects (from /predict response),
    return a severity-colored GeoJSON for map rendering.
    """
    try:
        return geo_svc.get_corridors_colored(affected_corridors)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Corridor GeoJSON not found. Add demo_data/bengaluru_corridors.geojson."
        )
