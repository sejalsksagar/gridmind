"""
app/services/recommendation.py

Provides resource recommendations and affected-corridor lookups
based on a predicted congestion class.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

from app.models.schemas import CongestionClass, AffectedCorridor, ResourceRecommendation


# ---------------------------------------------------------------------------
# Resource allocation table
# (officers, barricades, diversions, signal_overrides)
# ---------------------------------------------------------------------------
_RESOURCES: dict[CongestionClass, tuple[int, int, int, int]] = {
    CongestionClass.LOW:    (2,  0, 0, 0),
    CongestionClass.MEDIUM: (5,  1, 0, 1),
    CongestionClass.HIGH:   (10, 3, 1, 2),
    CongestionClass.SEVERE: (18, 5, 2, 3),
}

# ---------------------------------------------------------------------------
# Rationale strings
# ---------------------------------------------------------------------------
_RATIONALE: dict[CongestionClass, str] = {
    CongestionClass.LOW: (
        "Minor impact expected. Standard patrol presence sufficient; "
        "no active traffic management required."
    ),
    CongestionClass.MEDIUM: (
        "Moderate congestion likely. Additional officers deployed for "
        "crowd management; signal timing adjusted on primary approach."
    ),
    CongestionClass.HIGH: (
        "Significant disruption anticipated. Road diversion activated, "
        "barricades placed at key junctions, and multiple signal overrides engaged."
    ),
    CongestionClass.SEVERE: (
        "Critical congestion event. Full resource deployment required — "
        "maximum officer presence, full barricade perimeter, active diversions "
        "on all alternate routes, and city-wide signal override protocol."
    ),
}

# ---------------------------------------------------------------------------
# Adjacent corridor map
# ---------------------------------------------------------------------------
_ADJACENT_CORRIDORS: dict[str, list[str]] = {
    "Tumkur Road":       ["Bellary Road 1", "Magadi Road"],
    "Mysore Road":       ["Kanakapura Road", "Bannerghatta Road"],
    "Hosur Road":        ["Bannerghatta Road", "ORR East 2"],
    "Bellary Road 1":    ["Bellary Road 2", "ORR North 1"],
    "ORR East 1":        ["ORR East 2", "Old Madras Road"],
    "Old Madras Road":   ["ORR East 1", "Hosur Road"],
    "Bannerghatta Road": ["Mysore Road", "Hosur Road"],
    "Magadi Road":       ["Tumkur Road", "West of Chord Road"],
}

# ---------------------------------------------------------------------------
# Severity cascade
# Maps a congestion class to the classes that adjacent corridors may inherit
# ---------------------------------------------------------------------------
_SEVERITY_CASCADE: dict[CongestionClass, list[CongestionClass]] = {
    CongestionClass.SEVERE: [CongestionClass.HIGH, CongestionClass.MEDIUM],
    CongestionClass.HIGH:   [CongestionClass.MEDIUM, CongestionClass.LOW],
    CongestionClass.MEDIUM: [CongestionClass.LOW],
    CongestionClass.LOW:    [],
}

# ---------------------------------------------------------------------------
# Expected delay in minutes per congestion class
# ---------------------------------------------------------------------------
_DELAY_MINUTES: dict[CongestionClass, int] = {
    CongestionClass.LOW:    5,
    CongestionClass.MEDIUM: 15,
    CongestionClass.HIGH:   30,
    CongestionClass.SEVERE: 45,
}


# ---------------------------------------------------------------------------
# Public data structures
# ---------------------------------------------------------------------------

# @dataclass
# class ResourceRecommendation:
#     congestion_class: str
#     officers: int
#     barricades: int
#     diversions: int
#     signal_overrides: int
#     rationale: str


# @dataclass
# class AffectedCorridor:
#     name: str
#     cascaded_severity: str
#     expected_delay_minutes: int


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def recommend(congestion_class: CongestionClass) -> ResourceRecommendation:
    """
    Return a ResourceRecommendation for the given congestion class,
    including officer counts, infrastructure resources, and a rationale string.
    """
    officers, barricades, diversions, signal_overrides = _RESOURCES[congestion_class]
    return ResourceRecommendation(
        congestion_class=congestion_class.value,
        officers=officers,
        barricades=barricades,
        diversions=diversions,
        signal_overrides=signal_overrides,
        rationale=_RATIONALE[congestion_class],
    )


def get_affected_corridors(
    corridor: str,
    congestion_class: CongestionClass,
) -> List[AffectedCorridor]:
    """
    Return a list of AffectedCorridor objects for each corridor adjacent to
    *corridor*, annotated with the cascaded severity class and expected delay.

    If *corridor* is not in the adjacency map an empty list is returned.
    """
    adjacent_names = _ADJACENT_CORRIDORS.get(corridor, [])
    cascaded_classes = _SEVERITY_CASCADE[congestion_class]

    affected: list[AffectedCorridor] = []
    for i, name in enumerate(adjacent_names):
        # Assign cascaded severity by position; fall back to LOW when the
        # cascade list is shorter than the number of adjacent corridors.
        if cascaded_classes:
            cascade_cls = cascaded_classes[min(i, len(cascaded_classes) - 1)]
        else:
            # congestion_class is LOW → no meaningful cascade
            continue

        affected.append(
            AffectedCorridor(
                name=name,
                severity=cascade_cls.value,
                estimated_delay_minutes=_DELAY_MINUTES[cascade_cls],
            )
        )

    return affected