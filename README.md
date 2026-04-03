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

- Python 3.11+
- Node 18+
- PostgreSQL 14+ (local or Docker), or Railway Postgres in deployment

## Environment variables

### Backend (`backend/.env` or process env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URL (SQLAlchemy format, e.g. `postgresql+psycopg2://user:pass@host:5432/dbname`) |
| `JWT_SECRET_KEY` | Secret for signing HS256 access tokens (use a long random value in production) |
| `LLM_API_KEY` | Optional; if unset, `/api/confirm` uses a deterministic fake LLM in tests |
| `LLM_MODEL` | OpenAI-compatible model name when using a live key |
| `CORS_ORIGINS` | Comma-separated origins for the browser app (no trailing slash on each origin; include your Railway frontend URL in production) |

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

For **production**, set the same variables as secrets on your host (Railway, Fly, etc.). The frontend does not need the key; only the backend calls Lava.

### Frontend (build-time)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Public API origin (e.g. `https://your-api.up.railway.app`). For local dev, leave empty and use the Vite proxy to `http://127.0.0.1:8000`. |

Set `VITE_*` variables **before** `npm run build` on Railway so Vite embeds them. Redeploy the frontend after changing them.

## Local development

### 1. Create schema and seed PostgreSQL from sample CSVs

Ensure PostgreSQL is running and `DATABASE_URL` in `backend/.env` points at it. Apply migrations, then import.

```powershell
cd backend
pip install -r requirements-dev.txt
alembic upgrade head
cd ..
python scripts/import_csv_to_postgres.py
```

Arizona MVP bundle (adds `data/az-data` providers + hospital rates + synthetic prices):

```powershell
python scripts/import_csv_to_postgres.py --az-mvp
```

### 2. Run the API

```powershell
cd backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/api/health` (includes `database_connected` and `lava_configured`).

### 3. Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000` (see `frontend/vite.config.ts`).

### 4. Tests (TDD gate)

Integration tests expect PostgreSQL. Set `TEST_DATABASE_URL` (and `DATABASE_URL`) to a dedicated test database, run `alembic upgrade head` once, then:

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
| GET | `/api/health` | Health check (`database_connected`, `lava_configured`) |
| POST | `/api/auth/register` | Email + password → JWT |
| POST | `/api/auth/login` | Email + password → JWT |
| GET | `/api/users/me` | Current user profiles (Bearer JWT) |
| PATCH | `/api/users/me` | Update `user_profile` / `insurance_profile` |
| POST | `/api/gi-assistant/symptom-refine` | Symptom → Gemini → GI CPT leaf suggestion |
| POST | `/api/gi-assistant/suggest-next` | Suggest next decision-tree branch (requires `LAVA_API_KEY`) |
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

Starts PostgreSQL and the API. Import data with `python scripts/import_csv_to_postgres.py` using the same `DATABASE_URL` as the API container (`postgresql+psycopg2://postgres:postgres@localhost:5432/carecost` from the host if you expose port 5432).

## Railway

1. Add the **PostgreSQL** plugin and copy `DATABASE_URL` into the backend service.
2. Set **`JWT_SECRET_KEY`** (long random string) and **`CORS_ORIGINS`** to your frontend origin. The Docker image runs **`alembic upgrade head`** on startup before Uvicorn.
3. Deploy the **backend** from `backend/`. Add **`LAVA_API_KEY`**, **`LAVA_API_BASE_URL`**, and **`LAVA_GEMINI_MODEL`** if you want GI AI features in production.
4. Build the **frontend** with `VITE_API_BASE_URL` pointing at your API; host `frontend/dist` as a static site.

## Disclaimer

Demo only — always **call your plan** to verify network status and cost.
