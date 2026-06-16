"""
Recommendation Engine
─────────────────────
Pure rule-based lookup — no ML needed.
Owned by Dev 2. Maps CongestionClass → resource counts + affected corridors.
"""

from app.schemas import CongestionClass, ResourceRecommendation, AffectedCorridor

# ─── Resource table ───────────────────────────────────────────────────────────

RESOURCE_TABLE: dict[str, dict] = {
    "Low": {
        "officers": 2, "barricades": 0, "diversions": 0, "signal_overrides": 0,
        "rationale": "Minor disruption. Local officer monitoring sufficient.",
    },
    "Medium": {
        "officers": 5, "barricades": 1, "diversions": 0, "signal_overrides": 1,
        "rationale": "Moderate congestion. Signal timing adjustment and barricade recommended.",
    },
    "High": {
        "officers": 10, "barricades": 3, "diversions": 1, "signal_overrides": 2,
        "rationale": "Significant corridor impact. Diversion route activation advised.",
    },
    "Severe": {
        "officers": 18, "barricades": 5, "diversions": 2, "signal_overrides": 3,
        "rationale": "Severe congestion. Maximum deployment with immediate diversions and closures.",
    },
}

# ─── Corridor adjacency ───────────────────────────────────────────────────────

ADJACENT_CORRIDORS: dict[str, list[str]] = {
    "Tumkur Road":        ["Bellary Road 1", "Magadi Road"],
    "Mysore Road":        ["Kanakapura Road", "Bannerghatta Road"],
    "Hosur Road":         ["Bannerghatta Road", "ORR East 2"],
    "Bellary Road 1":     ["Bellary Road 2", "ORR North 1"],
    "Old Madras Road":    ["ORR East 1", "Whitefield Main Road"],
    "ORR East 1":         ["ORR East 2", "Old Madras Road"],
    "ORR North 1":        ["ORR North 2", "Bellary Road 1"],
    "Bannerghatta Road":  ["Hosur Road", "Mysore Road"],
    "Kanakapura Road":    ["Mysore Road", "Bannerghatta Road"],
    "Magadi Road":        ["Tumkur Road", "Mysore Road"],
}

SEVERITY_CASCADE: dict[str, list[str]] = {
    "Severe": ["High", "Medium"],
    "High":   ["Medium", "Low"],
    "Medium": ["Low", "Low"],
    "Low":    [],
}

DELAY_BY_SEVERITY: dict[str, int] = {
    "Low": 5, "Medium": 15, "High": 30, "Severe": 45,
}

# ─── Public API ───────────────────────────────────────────────────────────────

def recommend(congestion_class: CongestionClass) -> ResourceRecommendation:
    return ResourceRecommendation(**RESOURCE_TABLE[congestion_class.value])


def get_affected_corridors(
    corridor: str,
    congestion_class: CongestionClass,
) -> list[AffectedCorridor]:
    result: list[AffectedCorridor] = [
        AffectedCorridor(
            name=corridor,
            severity=congestion_class,
            estimated_delay_minutes=DELAY_BY_SEVERITY[congestion_class.value],
        )
    ]

    adjacent = ADJACENT_CORRIDORS.get(corridor, [])
    cascade = SEVERITY_CASCADE.get(congestion_class.value, [])

    for i, adj_name in enumerate(adjacent[:2]):
        adj_severity = cascade[i] if i < len(cascade) else "Low"
        result.append(
            AffectedCorridor(
                name=adj_name,
                severity=CongestionClass(adj_severity),
                estimated_delay_minutes=DELAY_BY_SEVERITY[adj_severity],
            )
        )

    return result
