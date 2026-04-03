<div align="center">

# CareC❤️st

*Know what care costs before it costs you.*

</div>

CareCost is a **provenance-first healthcare shopping** experience: compare **out-of-pocket bands**, explore **providers on a map**, and use **AI agents** that ask interactive questions so you land on the right **CPT / procedure bundle**—then see it reflected on the map. The demo dataset focuses on **gastroenterology** (with plans to expand specialties). Stack: **FastAPI** + **PostgreSQL** + **Vite/React** (Leaflet).

---

## YHack — tracks & prizes

This README doubles as our hackathon submission notes: which tracks we’re aiming for, why the project fits, and which partner tech we used end to end.

### Main tracks

**Personal AI Agent (1st place)** — *Build intelligent agents that automate real business workflows and decision-making.*

We built **GI-focused agents** on the backend that automate parts of a real workflow: turning messy symptom language into **structured, plan-relevant procedure direction** (CPT / bundle alignment), walking users through a **GI decision tree** with an **“AI path helper”** that suggests the next branch, and supporting **intake → confirm → estimate** so users aren’t left doing clerical triage themselves. Together, those agents reduce manual back-and-forth and help users get from “I have symptoms / a referral” toward **actionable shopping on the map** instead of dead ends.

**Societal Impact (1st place)** — *Innovation that leads to the most significant societal impact.*

Healthcare cost and complexity disproportionately stress people who are already sick or scared. This project pushes **transparency and agency**: seeing **realistic cost bands**, **providers on a map**, and **clearer GI pathways** so people can make informed choices. That maps directly to broader societal goals: **less financial surprise, less decision paralysis, and more equitable access to information**—especially for a specialty where “just call your insurer” is rarely enough.

### Sponsor-side track

**Best use of Lava API** — We route our **AI agents** (symptom refinement, tree guidance) through **[Lava](https://lava.so)**’s OpenAI-compatible API to **Google Gemini**, so production-ready agent calls stay simple and consistent (`/v1/chat/completions`). See [Environment variables](#gi-assistant--lava-api-key-gemini) below for configuration.

### Category-side tracks

**Best First Hack** — Apart from **Kenza**, who also participated in the **Yale Health Hackathon** earlier this year, this was the **first hackathon** for **David**, **Austin**, and **Isaac**.

**Most on Theme Hack (Love)** — *Love through connection, community, or your own interpretation.*

We’re here for the **love of community**: helping neighbors **live healthier lives** and **reduce stress** around opaque costs and scary procedures. If love is showing up for people when the system is hard to navigate, we’d argue that fits.

**Best UI/UX** — *Intuitive, polished, delightful.*

We invested in a **clear map-first flow**, onboarding, and GI wizard UX—and leaned **lighthearted where it helps** (we hope a few moments feel funny on purpose) so the app stays human, not clinical-wallpaper. **We hope** judges see that as deliberate craft, not an afterthought.

**Most Creative Hack** — *Blow us away.*

We hope we did. It doesn’t have to be sci-fi “mind-blowing”; sadly, **caring this much about healthcare cost clarity** still isn’t the norm—and **trying to change that** feels pretty mind-blowing to us.

### MLH partner prizes (tech we used)

| Partner | How we used it |
|--------|----------------|
| **GoDaddy Registry** | Our **domain name** |
| **PostgreSQL** | **Database** for providers, scenarios, users, and app data |
| **Gemini** | **Model behind our agents**, called via **Lava** (see above) |
| **ElevenLabs** | **Voiceover** for our **presentation video** |
| **First-party auth** | **Email/password** + **JWT** stored in PostgreSQL |

---

## Prerequisites

- **Python 3.11+** (matches `backend` Docker image and CI)
- **Node 20+** (used in GitHub Actions; Node 18 often works)
- **PostgreSQL 14+** locally, **Docker Compose** (`postgres:16`), or **Railway Postgres** in deployment

## Environment variables

Settings are loaded from **`backend/.env`** (see `backend/app/config.py`). Names below match what you set in the shell or `.env` (Pydantic accepts the usual `UPPER_SNAKE` forms).

### Backend (`backend/.env` or process env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URL (SQLAlchemy + psycopg2), e.g. `postgresql+psycopg2://user:pass@host:5432/dbname` |
| `JWT_SECRET_KEY` | Secret for signing HS256 access tokens (**use a long random value in production**) |
| `JWT_ISSUER` | Optional; default `carecost-api` |
| `JWT_ACCESS_TTL_MINUTES` | Optional; access token lifetime (default `60`) |
| `LLM_API_KEY` | Optional; if unset, `/api/confirm` uses a deterministic fake LLM |
| `LLM_MODEL` | OpenAI-compatible model name when using a live key (default `gpt-4o-mini`) |
| `CORS_ORIGINS` | Comma-separated browser origins (**no trailing slash**); must include your Vite dev origin (`http://localhost:8080`) and production frontend URL |
| `SAMPLES_DIR` / `AZ_DATA_DIR` | Optional overrides for CSV paths (defaults: `../data/samples`, `../data/az-data` relative to `backend/`) |
| `TEST_DATABASE_URL` | **Tests only:** PostgreSQL URL for pytest (default `…/carecost_test`); see `backend/tests/conftest.py` |

### GI assistant — Lava API key (Gemini)

The onboarding/map **symptom conversation** and **GI path helper** call **Google Gemini** through **[Lava](https://lava.so)**’s OpenAI-compatible API (`/v1/chat/completions`). Without a key, those endpoints return **503** and the UI falls back to manual questions only.

1. Create a Lava account and generate an API key (Bearer token, often prefixed `aks_live_…`).
2. Copy the template and add your secret locally (**never commit** `backend/.env`):

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Set at minimum:

   | Variable | Description |
   |----------|-------------|
   | `LAVA_API_KEY` | **Required** for GI AI features |
   | `LAVA_API_BASE_URL` | Default `https://api.lava.so/v1` |
   | `LAVA_GEMINI_MODEL` | Gemini model id Lava routes for you (default `gemini-2.5-flash`) |

4. Restart the API after changing `.env`. Confirm with:

   `GET http://127.0.0.1:8000/api/health` → `"lava_configured": true`.

For **production**, set the same variables as secrets on your host (e.g. Railway). The frontend does not need the key; only the backend calls Lava.

### Frontend (build-time)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Public API origin (e.g. `https://your-api.up.railway.app`). For local dev, leave empty: the Vite dev server proxies `/api` to `http://127.0.0.1:8000` (default UI: `http://localhost:8080`). |

Set `VITE_*` variables **before** `npm run build` on Railway so Vite embeds them. Redeploy the frontend after changing them.

## Local development

### Data and docs in Git

The repo-root **`data/`** (sample + AZ CSVs) and **`docs/`** are listed in **`.gitignore`** so they are not committed. Keep those folders locally (or sync them outside Git) before running the import script.

**Automated tests** do not rely on `data/`: pytest uses tracked CSV copies under **`backend/tests/fixtures/`** (see `backend/tests/fixture_paths.py`).

The import CLI also accepts **`DATA_DIR`** (sample CSV folder) and **`AZ_DATA_DIR`** (AZ bundle) if you store files outside the default paths—see `scripts/import_csv_to_postgres.py`.

### 1. Create schema and seed PostgreSQL from sample CSVs

Ensure PostgreSQL is running and `DATABASE_URL` in `backend/.env` points at it.

Schema: **`Base.metadata.create_all`** runs the first time the app (or import script) obtains a DB engine via **`backend/app/db/postgres.py`**. Models live in **`backend/app/db/tables.py`** (there is no separate Alembic migration step in this repo).

```powershell
cd backend
pip install -r requirements-dev.txt
cd ..
python scripts/import_csv_to_postgres.py
```

Arizona MVP bundle (expects `data/az-data` with `providers.csv` and `hospital_rates_clean.csv`, plus seed `procedures.csv` / `insurers.csv` from samples unless you pass `--seed-dir`):

```powershell
python scripts/import_csv_to_postgres.py --az-mvp
```

### 2. Run the API

```powershell
cd backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/api/health` returns `status` **`ok`** when PostgreSQL is reachable, **`degraded`** otherwise; also includes `database_connected`, `database` (`postgresql`), and `lava_configured` (true when `LAVA_API_KEY` is set).

### 3. Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server defaults to **`http://localhost:8080`** and **proxies** `/api` to **`http://127.0.0.1:8000`** (`frontend/vite.config.ts`). For production builds, set `VITE_API_BASE_URL` to your API origin if the UI is not served behind the same host as the API.

### 4. Tests

- **Backend:** Integration and DB tests need PostgreSQL. Set `TEST_DATABASE_URL` to a dedicated database (pytest also sets `DATABASE_URL` from it in `conftest.py`). Schema is created with `create_all` for the test engine.

```powershell
cd backend
pytest
```

- **Frontend:**

```powershell
cd frontend
npm test
```

### 5. Continuous integration

**`.github/workflows/ci.yml`** runs on push and pull requests to `main` / `master`: backend `pytest`, production-requirements smoke import, Docker image build from `backend/`, and frontend `npm ci` + `npm test`.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health (`status`, `database_connected`, `lava_configured`) |
| POST | `/api/auth/register` | Email + password → JWT |
| POST | `/api/auth/login` | Email + password → JWT |
| GET | `/api/users/me` | Current user profiles (Bearer JWT) |
| PATCH | `/api/users/me` | Update `user_profile` / `insurance_profile` |
| POST | `/api/gi-assistant/symptom-refine` | Symptom interview → GI CPT leaf suggestion (503 if no Lava key) |
| POST | `/api/gi-assistant/suggest-next` | Suggest next decision-tree branch (503 if no Lava key) |
| POST | `/api/intake` | Validate and normalize intake; returns `missing_required` |
| POST | `/api/confirm` | LLM-assisted follow-ups (fake LLM without `LLM_API_KEY`) |
| POST | `/api/confirm/apply` | Merge answers; `ready_for_estimate` |
| POST | `/api/estimate` | Scenario → bundle → prices + OOP bands |
| GET | `/api/providers` | List providers (filters: `zip`, `specialty`, `bbox`, etc.) |
| GET | `/api/providers/{id}` | Provider detail |
| GET | `/api/hospitals` | Hospitals with coordinates and optional rate fields (`cpt` query, default colonoscopy CPT) |
| GET | `/api/hospitals/insurance-options` | Insurer / plan options derived from `hospital_rates` |

## Docker Compose (optional)

```powershell
docker compose up --build
```

Starts **PostgreSQL 16** and the **API** (`Dockerfile` in `backend/`). The API container sets `DATABASE_URL` to the `postgres` service. From the **host**, use `postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/carecost` when running `scripts/import_csv_to_postgres.py` so data lands in the same database. Set **`JWT_SECRET_KEY`** in the environment when composing if you override the default. Optional Lava/GI variables are not set in `docker-compose.yml`—add them if you need those features in containers.

## Railway

1. Add the **PostgreSQL** plugin and set **`DATABASE_URL`** on the backend service.
2. Set **`JWT_SECRET_KEY`** (long random string) and **`CORS_ORIGINS`** to your deployed frontend origin (exact URL, no trailing slash).
3. Deploy the **backend** from **`backend/`** (same layout as the Docker image). Schema is created on first DB connection. Add **`LAVA_API_KEY`**, **`LAVA_API_BASE_URL`**, and **`LAVA_GEMINI_MODEL`** for GI assistant endpoints in production.
4. Build the **frontend** with **`VITE_API_BASE_URL`** set to the public API URL before `npm run build`; serve `frontend/dist` as a static site.

## Disclaimer

Demo only — always **call your plan** to verify network status and cost.
