# GridMind API Contract — v2.1

---

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:8000` |
| Production | `https://gridmind-api.onrender.com` |

All backend endpoints are prefixed with `/api/v1`.

---

## External APIs (Mappls / MapmyIndia)

| API | Called By | Correct Endpoint |
|---|---|---|
| **Maps JS SDK** | Frontend (CDN script tag in `index.html`) | `https://apis.mappls.com/advancedmaps/api/{MAPPLS_API_KEY}/map_sdk?layer=vector&v=3.0` |
| **Directions API** | Backend (`/api/v1/diversion` → `services/diversion.py`) | `https://route.mappls.com/route/direction/route_adv/driving/{from_lng},{from_lat};{to_lng},{to_lat}?access_token={API_KEY}` |
| **Geocoding API** | Backend (stretch only) | `https://apis.mappls.com/advancedmaps/v1/{MAPPLS_API_KEY}/geocode?addr={corridor+name+Bengaluru}` |

> Directions API takes **longitude, latitude** order (lon first). The backend service handles the swap.

### How Each Mappls API Is Used

**Maps JS SDK** — Loaded once via `<script>` in `index.html`. Exposes the global `mappls` object. Renders basemap, corridor polylines, heatmap layer, and diversion route.

**Directions API** — Called server-side inside `POST /api/v1/diversion` via `services/diversion.py`. Returns encoded polyline decoded to `[[lat, lng]]` coordinates. Cached per coordinate pair to protect the 100 req/day free-tier limit.

**Geocoding API** — Stretch feature only. Not required for core demo.

---

## Backend Endpoints

---

### POST `/api/v1/predict`

Runs both LightGBM models and returns congestion class, duration class, duration range, affected corridors, resource recommendations, **and dynamic heatmap points**.

**Where used:**
- `EventForm.tsx` → `usePrediction.ts`
- Response triggers corridor polyline recoloring in `CorridorOverlay.tsx`
- `response.heatmap_points` fed directly to `mappls.HeatmapLayer` in `HeatmapLayer.tsx`

**Request**
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

**Response 200**
```json
{
  "congestion_class": "Severe",
  "confidence": 0.972,
  "duration_class": "Long",
  "duration_estimate_range": [120, 240],
  "affected_corridors": [
    { "name": "Tumkur Road",    "severity": "Severe", "estimated_delay_minutes": 45 },
    { "name": "Bellary Road 1", "severity": "High",   "estimated_delay_minutes": 20 },
    { "name": "Magadi Road",    "severity": "Medium",  "estimated_delay_minutes": 10 }
  ],
  "resources": {
    "officers": 18,
    "barricades": 5,
    "diversions": 2,
    "signal_overrides": 3,
    "rationale": "Severe congestion on named corridor with road closure. Maximum deployment required."
  },
  "heatmap_points": [
    { "lat": 13.040004, "lng": 77.518099, "weight": 1.00, "severity": "Severe" },
    { "lat": 13.050000, "lng": 77.590000, "weight": 0.75, "severity": "High"   },
    { "lat": 12.975000, "lng": 77.500000, "weight": 0.75, "severity": "High"   }
  ]
}
```

**`heatmap_points` rules:**
- Point [0] is always the event location (`request.latitude`, `request.longitude`), weighted by the predicted `congestion_class`.
- Points [1…N] are centroids of affected corridors whose names exist in `CORRIDOR_CENTROIDS` in `prediction.py`, weighted by one severity step below the primary class (cascaded impact).
- If an affected corridor has no known centroid it is silently omitted — no error.

**Severity → weight mapping:**

| Class | Weight |
|---|---|
| Low | 0.25 |
| Medium | 0.50 |
| High | 0.75 |
| Severe | 1.00 |

**Validation Rules**
- `latitude`: 12.7 – 13.3
- `longitude`: 77.3 – 78.0
- `start_datetime`: ISO8601 with timezone offset required
- `corridor`: any non-empty string; use `"Non-corridor"` for off-arterial events
- `veh_type`: optional; defaults to `"Unknown"`
- `event_cause` must be one of: `vehicle_breakdown`, `accident`, `construction`, `public_event`, `tree_fall`, `water_logging`, `pot_holes`, `road_conditions`, `congestion`, `procession`, `vip_movement`, `protest`, `others`

**Errors:** `422` validation error | `503` models not loaded

---

### POST `/api/v1/simulate`

Applies overrides to a base event and returns before/after `PredictionResponse` objects (each now including `heatmap_points`) plus a delta summary.

**Where used:** `SimulationControls.tsx` → `useSimulation.ts` → `DeltaDisplay.tsx`.

**Request**
```json
{
  "base_event": {
    "event_type": "unplanned",
    "event_cause": "construction",
    "latitude": 13.040004,
    "longitude": 77.518099,
    "requires_road_closure": true,
    "corridor": "Tumkur Road",
    "start_datetime": "2024-06-01T18:00:00+05:30",
    "veh_type": "Unknown"
  },
  "overrides": {
    "requires_road_closure": false,
    "start_hour": 10
  }
}
```

**Response 200**
```json
{
  "base":      { "...": "PredictionResponse — includes heatmap_points" },
  "simulated": { "...": "PredictionResponse with overrides — includes heatmap_points" },
  "delta": {
    "congestion_class":  "Severe → High",
    "officers":          -8,
    "barricades":        -2,
    "diversions":        -2,
    "signal_overrides":  -1,
    "confidence_change": -0.14
  },
  "improved": true
}
```

---

### GET `/api/v1/corridors/geojson`

Returns Bengaluru corridors as GeoJSON LineStrings, optionally colored by a severity map.

**Where used:** Called on startup for default polylines; re-called after `/predict` to recolor affected corridors in `CorridorOverlay.tsx`.

**Query Params**

| Param | Type | Description |
|---|---|---|
| `severity_map` | string | JSON string: `{"Tumkur Road":"Severe","Bellary Road 1":"High"}` |

**Response 200 — GeoJSON FeatureCollection**
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
        "weight": 6,
        "opacity": 0.85
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[77.5181, 13.0400], [77.5050, 13.0650], [77.4900, 13.1000]]
      }
    }
  ]
}
```

> Coordinates are `[longitude, latitude]` per GeoJSON spec. Swap to `{lat, lng}` when passing to `mappls.Polyline`.

---

### POST `/api/v1/diversion`

Calls the Mappls Directions API server-side and returns a decoded lat/lon route for the frontend to render as a dashed green polyline.

**Where used:** "Activate Diversion" button → `DiversionOverlay.tsx`.

**Request**
```json
{
  "from_lat": 13.040004,
  "from_lng": 77.518099,
  "to_lat":   13.066721,
  "to_lng":   77.470123,
  "avoid_corridor": "Tumkur Road"
}
```

**Response 200**
```json
{
  "route_coordinates": [
    [
      13.04002,
      77.51811
    ],
    [
      13.04177,
      77.51594
    ],
    [
      13.04332,
      77.51157
    ],
    [
      13.04505,
      77.50794
    ],
    [
      13.05516,
      77.4788
    ],
    [
      13.05856,
      77.46655
    ],
    [
      13.05888,
      77.46665
    ],
    [
      13.0587,
      77.46733
    ],
    [
      13.06266,
      77.4688
    ],
    [
      13.06243,
      77.46967
    ],
    [
      13.0646,
      77.47044
    ],
    [
      13.06553,
      77.47206
    ],
    [
      13.06644,
      77.47016
    ],
    [
      13.06669,
      77.47024
    ]
  ],
  "total_distance_m": 7389,
  "total_duration_s": 731,
  "summary": "Diversion route — 7.4 km, ~12 min"
}
```

`route_coordinates` are `[lat, lng]` order. Cached in memory per coordinate pair.

**Errors:** `503` Mappls API unreachable | `422` coordinates out of Bengaluru bounds

---

### GET `/api/v1/corridors/list`

Returns dropdown values for the EventForm corridor selector.

**Response 200**
```json
{
  "corridors": [
    "Tumkur Road", "Mysore Road", "Hosur Road", "Bellary Road 1",
    "Bellary Road 2", "ORR East 1", "ORR East 2", "ORR North 1",
    "ORR North 2", "Old Madras Road", "Magadi Road",
    "Bannerghatta Road", "West of Chord Road", "Non-corridor"
  ]
}
```

---

### GET `/api/v1/health`

**Response 200**
```json
{ "status": "ok", "models_loaded": true, "version": "2.0.0" }
```

---

## Severity Color Reference (map rendering)

| Class | Hex Color | Mappls Polyline Weight |
|---|---|---|
| Low | `#22C55E` | 3 |
| Medium | `#F59E0B` | 5 |
| High | `#EF4444` | 7 |
| Severe | `#7F1D1D` | 10 |

Default (unaffected): `#64748B`, weight 3.

---

## Error Responses

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| 422 | Validation error |
| 502 | Mappls upstream failure |
| 503 | ML models not loaded |
| 500 | Internal server error |

---

## Test Scenarios — Expected Outputs

### Scenario 1 — Severe

**Input**
```json
{
  "event_type": "unplanned", "event_cause": "construction",
  "latitude": 13.040004, "longitude": 77.518099,
  "requires_road_closure": true, "corridor": "Tumkur Road",
  "start_datetime": "2024-06-01T18:00:00+05:30", "veh_type": "heavy_vehicle"
}
```
```
congestion_class : Severe  (confidence ≈ 0.972)
duration_class   : Long    (confidence ≈ 0.997)
heatmap_points   : [event_location weight=1.00, affected corridor centroids weight=0.75]
```

### Scenario 2 — Low

**Input**
```json
{
  "event_type": "unplanned", "event_cause": "pot_holes",
  "latitude": 12.95, "longitude": 77.59,
  "requires_road_closure": false, "corridor": "Non-corridor",
  "start_datetime": "2024-06-01T14:00:00+05:30", "veh_type": "Unknown"
}
```
```
congestion_class : Low    (confidence ≈ 1.000)
duration_class   : Short  (confidence ≈ 0.996)
heatmap_points   : [event_location weight=0.25]
```

### Scenario 3 — High

**Input**
```json
{
  "event_type": "unplanned", "event_cause": "accident",
  "latitude": 12.971599, "longitude": 77.594563,
  "requires_road_closure": false, "corridor": "Hosur Road",
  "start_datetime": "2024-06-01T08:30:00+05:30", "veh_type": "Unknown"
}
```
```
congestion_class : High    (confidence ≈ 1.000)
duration_class   : Medium  (confidence ≈ 0.538)
heatmap_points   : [event_location weight=0.75, affected corridor centroids weight=0.50]
```

### Scenario 4 — Simulation base (veh_type omitted → "Unknown")

**Input** *(use as `base_event` in `/simulate`)*
```json
{
  "event_type": "unplanned", "event_cause": "construction",
  "latitude": 13.040004, "longitude": 77.518099,
  "requires_road_closure": true, "corridor": "Tumkur Road",
  "start_datetime": "2024-06-01T18:00:00+05:30"
}
```
```
congestion_class : Severe  (confidence ≈ 0.968)
duration_class   : Long    (confidence ≈ 0.999)
```

### Scenario 5 — After intervention (road closure lifted)

**Input**
```json
{
  "event_type": "unplanned", "event_cause": "construction",
  "latitude": 13.040004, "longitude": 77.518099,
  "requires_road_closure": false, "corridor": "Tumkur Road",
  "start_datetime": "2024-06-01T18:00:00+05:30"
}
```
```
congestion_class : High  (confidence ≈ 1.000)
duration_class   : Long  (confidence ≈ 0.999)
```

### Simulation delta — Scenarios 4 → 5

```json
{
  "delta": {
    "congestion_class": "Severe → High",
    "officers": -8, "barricades": -2,
    "diversions": -1, "signal_overrides": -1,
    "confidence_change": -0.032
  },
  "improved": true
}
```

---


## Environment Variables

```bash
# backend/.env  (server-side, never expose)
MAPPLS_API_KEY=your_key_here

# frontend/.env.local  (publishable — allowlist your domains in Mappls dashboard)
VITE_MAPPLS_KEY=your_key_here
VITE_API_BASE_URL=http://localhost:8000
```