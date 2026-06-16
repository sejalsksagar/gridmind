# GridMind — AI Traffic Command Center
> Gridlock Hackathon 2.0 | Event-Driven Congestion Prediction for Bengaluru

---

## Quick Start

### 1 — Clone & enter
```bash
git clone https://github.com/your-team/gridmind.git
cd gridmind
```

### 2 — Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 3 — Frontend (new terminal)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:5173
```

### 4 — ML training (optional — pre-trained artifacts are committed)
```bash
cd ml
pip install -r requirements.txt
python train.py --data ../datasets/events.csv
# → writes artifacts/severity_model.pkl etc.
```

---

## Project Structure

```
gridmind/
├── backend/          FastAPI prediction + simulation + geojson APIs
├── frontend/         React + Leaflet command center dashboard
├── ml/               Training pipeline and inference helpers
├── notebooks/        EDA + model evaluation (for judges)
├── datasets/         Raw CSV (not committed — add yours here)
├── demo_data/        Hardcoded demo scenarios + GeoJSON
└── docs/             Architecture diagrams, API contracts
```

## Team

| Developer | Role | Branch |
|---|---|---|
| Dev 1 | ML Engineer | `feature/ml-pipeline` |
| Dev 2 | Backend Engineer | `feature/backend-api` |
| Dev 3 | Frontend Engineer | `feature/frontend-dashboard` |

## Integration Day: Day 3 EOD

Every branch merges to `main` by Day 3. Before that, Dev 3 uses mock responses.

---

## API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/health` | GET | Service health + model status |
| `/api/v1/predict` | POST | Predict congestion class + recommendations |
| `/api/v1/simulate` | POST | What-if simulation with overrides |
| `/api/v1/recommend` | POST | Resource recommendations for a severity class |
| `/api/v1/map/corridors` | GET | GeoJSON corridor features |
| `/api/v1/map/heatpoints` | GET | Event heatmap points |
| `/api/v1/map/corridors/list` | GET | Valid corridor names |

Full docs at `http://localhost:8000/docs` once backend is running.
