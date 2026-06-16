# GridMind API Contract
> Single source of truth for all three developers.
> Dev 2 owns implementation. Dev 3 consumes. Dev 1 verifies prediction outputs.

---

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:8000` |
| Production | `https://gridmind-api.onrender.com` |

All endpoints are prefixed with `/api/v1`.

---

## POST `/api/v1/predict`

### Request
```json
{
  "event_type": "unplanned",
  "event_cause": "construction",
  "latitude": 13.040004,
  "longitude": 77.518099,
  "requires_road_closure": true,
  "corridor": "Tumkur Road",
  "start_datetime": "2024-06-01T18:00:00+05:30",
  "veh_type": "heavy_vehicle"
}
```

### Response 200
```json
{
  "congestion_class": "Severe",
  "confidence": 0.91,
  "duration_class": "Long",
  "duration_estimate_range": [120, 240],
  "affected_corridors": [
    { "name": "Tumkur Road",    "severity": "Severe", "estimated_delay_minutes": 45 },
    { "name": "Bellary Road 1", "severity": "High",   "estimated_delay_minutes": 20 },
    { "name": "Magadi Road",    "severity": "Medium",  "estimated_delay_minutes": 15 }
  ],
  "resources": {
    "officers": 18,
    "barricades": 5,
    "diversions": 2,
    "signal_overrides": 3,
    "rationale": "Severe congestion. Maximum deployment with immediate diversions and corridor closures."
  }
}
```

### Validation Rules
- `latitude`: 12.7 – 13.3 (Bengaluru bounds)
- `longitude`: 77.3 – 78.0 (Bengaluru bounds)
- `start_datetime`: ISO8601 with timezone offset required
- `corridor`: any string; "Non-corridor" for events not on named arterials
- `veh_type`: optional; defaults to "Unknown"

---

## POST `/api/v1/simulate`

### Request
```json
{
  "base_event": { /* same as /predict request */ },
  "overrides": {
    "requires_road_closure": false,
    "start_hour": 10,
    "event_cause": "vehicle_breakdown"
  }
}
```

### Response 200
```json
{
  "base": { /* PredictionResponse */ },
  "simulated": { /* PredictionResponse with overrides */ },
  "delta": {
    "congestion_class": "Severe → High",
    "officers": -8,
    "barricades": -2,
    "diversions": -1,
    "confidence_change": -0.08
  },
  "improved": true
}
```

---

## POST `/api/v1/recommend`

### Request
```json
{ "congestion_class": "High" }
```

### Response 200
```json
{
  "officers": 10,
  "barricades": 3,
  "diversions": 1,
  "signal_overrides": 2,
  "rationale": "Significant corridor impact. Diversion route activation advised."
}
```

---

## GET `/api/v1/map/corridors`

### Query Params
| Param | Type | Description |
|---|---|---|
| `corridors` | string | Comma-separated corridor names to filter |
| `severity` | string | Apply this severity color to all returned features |

### Response 200 — GeoJSON FeatureCollection
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Tumkur Road",
        "severity": "Severe",
        "color": "#7F1D1D",
        "weight": 10,
        "opacity": 0.85,
        "estimated_delay_minutes": 45
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[77.5181, 13.0400], [77.5050, 13.0620], [77.4900, 13.0900]]
      }
    }
  ]
}
```

---

## POST `/api/v1/map/corridors/colored`

### Request — array of AffectedCorridor objects
```json
[
  { "name": "Tumkur Road",    "severity": "Severe", "estimated_delay_minutes": 45 },
  { "name": "Bellary Road 1", "severity": "High",   "estimated_delay_minutes": 20 }
]
```

### Response — same GeoJSON format as GET /map/corridors

---

## GET `/api/v1/map/corridors/list`

### Response
```json
{
  "corridors": [
    "Tumkur Road", "Mysore Road", "Hosur Road",
    "Bellary Road 1", "ORR East 1", "..."
  ]
}
```

---

## GET `/api/v1/health`

### Response
```json
{
  "status": "ok",
  "models_loaded": true,
  "mock_mode": false,
  "version": "1.0.0",
  "environment": "production"
}
```

---

## Severity Colors (for map rendering)

| Class  | Hex Color | Leaflet Line Weight |
|---|---|---|
| Low    | `#22C55E` | 3 |
| Medium | `#F59E0B` | 5 |
| High   | `#EF4444` | 7 |
| Severe | `#7F1D1D` | 10 |

---

## Error Responses

```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| 422 | Validation error (bad lat/lon, missing field, invalid datetime) |
| 503 | Models not loaded (check `mock_mode` in /health) |
| 500 | Internal server error |
