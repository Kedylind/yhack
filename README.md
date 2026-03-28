# Boston GI Healthcare Map Demo

Provenance-first healthcare shopping demo for **Boston**, **Gastroenterology**, **Blue Cross Blue Shield of Massachusetts**. Stack: **FastAPI** + **MongoDB** + **Vite/React** (Leaflet map).

## Prerequisites

- Python 3.11+
- Node 18+
- MongoDB 6+ (local or Docker), or use Railway/Atlas in deployment

## Environment variables

### Backend (`backend/.env` or process env)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Mongo connection string (default `mongodb://localhost:27017`) |
| `MONGODB_DB_NAME` | Database name (default `boston_gi_demo`) |
| `LLM_API_KEY` | Optional; if unset, `/api/confirm` uses a deterministic fake LLM in tests |
| `LLM_MODEL` | OpenAI-compatible model name when using a live key |
| `CORS_ORIGINS` | Comma-separated origins for the browser app |

### Frontend (build-time)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Public API origin (e.g. `https://your-api.up.railway.app`). For local dev, leave empty and use the Vite proxy to `http://127.0.0.1:8000`. |

## Local development

### 1. Seed MongoDB from sample CSVs

From the repo root (with Mongo running). The importer loads **`backend/.env`** automatically so `MONGODB_URI` matches the API.

```powershell
cd backend
pip install -r requirements-dev.txt
cd ..
python scripts/import_csv_to_mongo.py
```

To override for one run: `$env:MONGODB_URI = "mongodb://localhost:27017"` (or your Atlas URI).

Dry-run (in-memory parse, requires `mongomock` from dev requirements):

```powershell
python scripts/import_csv_to_mongo.py --dry-run
```

### 2. Run the API

```powershell
cd backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/api/health`

### 3. Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000` (see `frontend/vite.config.ts`).

### 4. Tests (TDD gate)

```powershell
cd backend
pytest
```

```powershell
cd frontend
npm test
```

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/intake` | Validate and normalize intake; returns `missing_required` |
| POST | `/api/confirm` | LLM-assisted follow-ups (mocked without `LLM_API_KEY`) |
| POST | `/api/confirm/apply` | Merge answers; `ready_for_estimate` |
| POST | `/api/estimate` | Scenario → bundle → prices + OOP bands |
| GET | `/api/providers` | List GI providers (filters: `zip`, `specialty`, `bbox`) |
| GET | `/api/providers/{id}` | Provider detail |

## Docker Compose (optional)

```powershell
docker compose up --build
```

Starts MongoDB and the API; import data separately with `import_csv_to_mongo.py` pointed at the compose Mongo URI.

## Railway

1. Create a **MongoDB** plugin (or Atlas) and set `MONGODB_URI`.
2. Deploy the **backend** from `backend/` (Dockerfile) with `CORS_ORIGINS` set to your static site origin.
3. Build the **frontend** with `VITE_API_BASE_URL` = your API URL; host `frontend/dist` as a static site or serve behind the same origin.

## Disclaimer

Demo only — always **call your plan** to verify network status and cost.
