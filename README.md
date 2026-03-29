<div align="center">

# CareC❤️st

*Know what care costs before it costs you.*

</div>

CareCost is a **provenance-first healthcare shopping** experience: compare **out-of-pocket bands**, explore **providers on a map**, and use **AI agents** that ask interactive questions so you land on the right **CPT / procedure bundle**—then see it reflected on the map. The demo dataset focuses on **gastroenterology** (with plans to expand specialties). Stack: **FastAPI** + **MongoDB** + **Vite/React** (Leaflet).

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
| **MongoDB** | **Database** for providers, scenarios, and app data |
| **Gemini** | **Model behind our agents**, called via **Lava** (see above) |
| **ElevenLabs** | **Voiceover** for our **presentation video** |
| **Auth0** | **Authentication** to secure the platform |

---

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
| `CORS_ORIGINS` | Comma-separated origins for the browser app (no trailing slash on each origin; include your Railway frontend URL in production) |
| `AUTH0_DOMAIN` | Auth0 tenant domain (e.g. `dev-xxx.us.auth0.com`) |
| `AUTH0_AUDIENCE` | API identifier from Auth0 **APIs** (must match the SPA `audience` / access token `aud` claim) |
| `AUTH0_ISSUER` | Issuer URL, must match JWT `iss` (typically `https://YOUR_AUTH0_DOMAIN/`) |

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
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain (SPA application) |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Same identifier as `AUTH0_AUDIENCE` on the API (access token audience) |

Set `VITE_*` variables **before** `npm run build` on Railway so Vite embeds them. Redeploy the frontend after changing them.

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

Health: `GET http://127.0.0.1:8000/api/health` (includes `lava_configured` for the GI assistant).

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
| GET | `/api/health` | Health check (`lava_configured` reflects `LAVA_API_KEY`) |
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

Starts MongoDB and the API; import data separately with `import_csv_to_mongo.py` pointed at the compose Mongo URI.

## Railway

1. Create a **MongoDB** plugin (or Atlas) and set `MONGODB_URI`.
2. Deploy the **backend** from `backend/` (Dockerfile) with `CORS_ORIGINS` set to your static site origin. Add **`LAVA_API_KEY`**, **`LAVA_API_BASE_URL`**, and **`LAVA_GEMINI_MODEL`** as secrets if you want the GI AI features in production.
3. Build the **frontend** with `VITE_API_BASE_URL` = your API URL; host `frontend/dist` as a static site or serve behind the same origin.

## Disclaimer

Demo only — always **call your plan** to verify network status and cost.
