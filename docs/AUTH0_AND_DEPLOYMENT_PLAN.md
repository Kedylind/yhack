# Auth0 Authentication & Railway Deployment — Implementation Plan

**Audience:** Next agent implementing changes in `Kedylind/yhack`  
**Scope:** Auth0-based email login, user profiles aligned with existing `UserProfile` / `InsuranceProfile`, and fixes required for stable online deployment.  
**Constraint:** This document is planning only; it does not modify application code by itself.  
**Process:** Implementation **must follow TDD (test-driven development)** — see **§3** and **§11**.

---

## 1. Current state (baseline)

### 1.1 Frontend

- **`frontend/src/context/AuthContext.tsx`** — Client-only stub: `login` / `signup` accept `(email, password)` but ignore password and set `isAuthenticated: true` with `{ email }` only. **TODOs** reference wiring to a backend.
- **Types** — `frontend/src/types/index.ts` defines `UserProfile` (fullName, dob, zip, phone) and `InsuranceProfile` (carrier, plan, deductibles, etc.). These are **app-specific** and should remain the source of shape for “profile” UX whether data lives in React state, Mongo, or Auth0 metadata.
- **Routes** — Login, Signup, Onboarding, Map, etc. (`App.tsx`). Auth gates (if any) should be reviewed after Auth0 integration.

### 1.2 Backend

- **`backend/app/config.py`** — Already has placeholders: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER` (plus `JWT_SECRET_KEY` for any legacy/custom paths).
- **`backend/app/routes/auth.py`** — References `RegisterRequest`, `LoginRequest`, `AuthService`; **`AuthService` and full request models are not consistently present** in the repo. Router is **not** mounted in `app/routes/__init__.py`, so it does not run today.
- **Public API** — Intake, confirm, estimate, providers, hospitals, GI assistant — most routes are **unauthenticated** today. Decide which routes (if any) require a valid JWT for v1.

### 1.3 Deployment pain points (known)

| Issue | Symptom | Root cause |
|--------|---------|------------|
| Frontend cannot reach API on Railway | Map shows “Could not load data”; `fetch` to wrong host | Production build needs `VITE_API_BASE_URL` at **build time**; dev uses Vite proxy only. |
| CORS failures | Browser blocks API calls | `CORS_ORIGINS` on API must list **exact** frontend origin(s); avoid trailing slash mismatch (`https://app.com` vs `https://app.com/`). |
| Docker API crash on start | Container exits / healthcheck fails | **`requirements.txt`** uses `pydantic>=2.8.0` without `[email]` while **`app/models/api.py`** uses `EmailStr`; **`pyproject.toml`** correctly specifies `pydantic[email]`. Docker installs only `requirements.txt` → missing **`email-validator`** in production image. |
| CI vs prod skew | Tests pass, Railway fails | CI may use `requirements-dev.txt` (includes `email-validator`); Dockerfile does not. |

---

## 2. Goals

1. **Authentication:** Use **Auth0** as the identity provider — **email/password and/or social** via Auth0 Universal Login (not custom password storage in Mongo for primary login).
2. **User profiles:** Preserve the **existing mental model**: authenticated user has **email** (from Auth0) plus optional **`UserProfile` / `InsuranceProfile`** data already modeled in the app. Decide **where** profile JSON lives (see §6).
3. **Deployment:** Apply **dependency and env fixes** so Railway **API** and **frontend** builds behave like documented in README / team handoff.
4. **Quality:** Deliver the above using **TDD** (§3) — tests define contracts before implementation ships.

---

## 3. TDD mandate (how to execute this plan)

All implementation work in this plan should follow **test-driven development**:

1. **Red —** Write a **failing** automated test first (pytest for backend, Vitest for frontend) that specifies the desired behavior or contract (e.g. `401` without Bearer, `200` with valid mocked JWT; API client attaches `Authorization` when token getter returns a value).
2. **Green —** Write the **minimum** application code to make that test pass.
3. **Refactor —** Clean up while keeping tests green; do not skip tests to “go faster.”

**Rules of thumb**

| Area | TDD approach |
|------|----------------|
| **Deployment fix (`requirements.txt`)** | Add a **smoke test** that fails without `email-validator` / `pydantic[email]` (e.g. `import app.main` after `pip install -r requirements.txt` only) **before** changing deps; or CI job that `docker build`s backend — test fails until Dockerfile/requirements align. |
| **JWT validation** | Unit tests with **fixed RSA keypair** or canned JWTs + mocked JWKS response; no live Auth0 in unit tests. |
| **FastAPI routes** | `TestClient` integration tests for protected vs public behavior **before** wiring production JWKS fetch (mock the verifier). |
| **Frontend Auth0 + `fetch`** | Mock `@auth0/auth0-react` and assert headers on `fetch` (or a thin `getAccessToken` wrapper) **before** full E2E. |
| **Profile CRUD** | Repository tests with mongomock or test DB; route tests for `GET/PATCH /api/users/me` **before** UI polish. |

**Out of scope for automated TDD:** Pure Auth0 Dashboard clicks, Railway env UI, and one-off manual E2E in a real browser — still do a short **manual checklist** after CI passes.

---

## 4. Recommended architecture (high level)

```
[Browser] → Auth0 Universal Login (OIDC)
         → [SPA] obtains ID token + access token (audience = FastAPI API)
         → [SPA] calls https://<api>/api/... with Authorization: Bearer <access_token>
         → [FastAPI] validates JWT (issuer, audience, signature via JWKS), optional user upsert in Mongo
```

- **SPA:** Register an Auth0 **Single Page Application** application.
- **API:** Register an Auth0 **API** with a unique **identifier** = **audience** string (e.g. `https://api.yourproduct.com` or Railway URL–based identifier — must be **stable**).

Use the **access token** with the API audience for backend calls; use **ID token** or Auth0 Management / userinfo for display name and email in the UI.

---

## 5. Auth0 Dashboard checklist (manual)

1. **Tenant** — Note Auth0 domain: `{tenant}.auth0.com` or custom domain.
2. **Application (SPA)**  
   - Type: **Single Page Application**.  
   - **Allowed Callback URLs:** `http://localhost:8080`, `http://localhost:5173`, `https://<frontend-railway-domain>` (and paths Auth0 expects, e.g. `/callback` if using default redirect).  
   - **Allowed Logout URLs:** same origins.  
   - **Allowed Web Origins:** frontend origins (for silent auth / CORS-related behavior).  
3. **API**  
   - Create API; set **Identifier** = value used as **`AUTH0_AUDIENCE`** (this is the JWT `aud` claim).  
   - Enable RBAC / permissions only if product needs fine-grained scopes later.
4. **Connections** — Enable **Username-Password-Authentication** (and optionally Google, etc.).
5. **Actions / Rules (optional)** — Add custom claims to access token if needed (e.g. internal `user_id`); keep tokens small.

Document **Client ID**, **Domain**, **Audience**, and **Issuer** (typically `https://{domain}/` — must match what the backend validates).

---

## 6. User profiles: where to store data

**Email and subject:**

- **Auth0** is source of truth for **identity** (`sub`, `email`, `email_verified`, name claims).

**`UserProfile` / `InsuranceProfile` (PHI-adjacent):**

- **Option A — Mongo only (recommended for healthcare demo):** On first authenticated API call, **upsert** a `users` (or `profiles`) document keyed by **`auth0_sub`** (or email, with care for email changes). Store `UserProfile` / `InsuranceProfile` fields the app already uses. Auth0 holds login; Mongo holds app profile.  
- **Option B — Auth0 `user_metadata`:** Possible for non-sensitive prefs; **avoid** storing full insurance/member details in Auth0 metadata without legal review — often **Mongo** is clearer for app-specific healthcare fields.
- **Option C — Hybrid:** Auth0 `app_metadata` for roles; Mongo for profile.

**Next agent should:** Pick **Option A** unless product explicitly wants zero backend profile DB — then document tradeoffs.

---

## 7. Frontend implementation plan

### 7.1 Dependencies

- Add **`@auth0/auth0-react`** (or current Auth0 SPA SDK).

### 7.2 Environment variables (Vite)

Prefix with `VITE_` for client exposure:

| Variable | Purpose |
|----------|---------|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | SPA application Client ID |
| `VITE_AUTH0_AUDIENCE` | API identifier (must match backend) |

**Local:** `.env` / `.env.local` (gitignored).  
**Railway (frontend service):** Set these **before** `npm run build` so Vite embeds them.

### 7.3 Provider wiring

- Wrap the app (inside or above existing `AuthProvider`) with Auth0’s **`Auth0Provider`** using `domain`, `clientId`, `authorizationParams: { audience, redirect_uri } }`.
- **Refactor `AuthContext`** to one of:
  - **Compose:** Keep `AuthContext` for `profile`, `insurance`, `intakePayload`, onboarding flags; derive `isAuthenticated` and `user.email` from `useAuth0()` instead of fake login/signup.
  - **Or** merge concepts into a single provider — avoid duplicate “logged in” state.

### 7.4 Login / Signup pages

- Replace fake email/password forms with **redirect to Auth0** (`loginWithRedirect`) or embedded Lock only if product requires it (Universal Login is default).
- **Signup** is often the same flow with Auth0 **Database** connection + “Sign up” link in Universal Login, or a separate `screen_hint=signup` if supported — align UX copy with Auth0 dashboard.

### 7.5 Calling the FastAPI backend

- Use **`getAccessTokenSilently({ authorizationParams: { audience } })`** and pass:
  - `Authorization: Bearer <token>` on **`fetch`** in `frontend/src/api/client.ts` (or a wrapper).
- Ensure **all** API modules use this helper so Map, estimate, hospitals, etc. work when routes are protected.

### 7.6 Profile sync UX

- After login, optionally **`GET /api/users/me`** (new route) to load Mongo profile into `AuthContext.setProfile` / `setInsurance`.
- **`PATCH /api/users/me`** to save onboarding data — requires JWT.

---

## 8. Backend implementation plan

### 8.1 JWT validation middleware

- Add dependency (e.g. **`python-jose`** with JWKS, or **`PyJWT`** + **`cryptography`**, or **`auth0-python`** patterns) to:
  - Fetch JWKS from `https://{AUTH0_DOMAIN}/.well-known/jwks.json` (cache with TTL).
  - Validate: `iss` (issuer), `aud` (audience), `exp`, `sub`.
- **`AUTH0_ISSUER`** should match token `iss` exactly (often `https://{domain}/`).

### 8.2 FastAPI dependencies

- **`get_current_user_optional`** — Returns `sub` + claims if Bearer valid; `None` if missing (for public routes).  
- **`get_current_user_required`** — HTTP 401 if invalid/missing.

Apply only to routes that need protection (start with **`/api/users/me`**; leave public GETs open until product requires auth).

### 8.3 User repository

- Reuse or extend **`app/db/repositories/user_repository.py`** / **`UserDB`** model:
  - Primary key: **`auth0_sub`** (string).
  - Fields: email (cache), `full_name`, links to profile blobs matching Pydantic models used by API.

### 8.4 Remove or finish legacy auth

- **`app/routes/auth.py`** — Either **delete** password-based routes or **replace** with Auth0-only flows (unlikely to need register/login endpoints if Universal Login handles it).
- Remove imports of non-existent **`AuthService`** / missing Pydantic models to avoid **import rot** if someone mounts the router by mistake.

### 8.5 Config

- Document required env vars for production:
  - `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ISSUER`
  - Existing `CORS_ORIGINS` must include frontend Railway URL(s).

---

## 9. Deployment fixes (must-do, independent of Auth0)

Complete these **before** or **in parallel** with Auth0 work so Railway stays stable.

### 9.1 Backend Docker / `requirements.txt`

- Align with **`pyproject.toml`**: use **`pydantic[email]>=2.8.0`** **or** add explicit **`email-validator`** dependency in **`requirements.txt`** (what the Dockerfile installs).
- **Verify:** Build Docker image locally; `docker run` and hit `/api/health` — no ImportError on startup.

### 9.2 CI alignment

- Add a job step **or** a small script that runs **`docker build`** for `backend/` (same Dockerfile as Railway) so **CI fails** when production requirements are broken.
- Alternatively, change CI to **`pip install -r requirements.txt`** only for a smoke **`python -c "import app.main"`** test.

### 9.3 Railway — API service

- **`MONGODB_URI`**, **`MONGODB_DB_NAME`**
- **`CORS_ORIGINS`:** comma-separated, **no trailing slash** on origins, include `https://<frontend-public-host>`
- Secrets: Auth0 vars above when backend validates JWT

### 9.4 Railway — Frontend service

- **`VITE_API_BASE_URL`** = `https://<api-public-host>` (no path)
- **`VITE_AUTH0_*`** vars for build
- **Redeploy** after any `VITE_*` change so Vite rebuilds.

### 9.5 Auth0 allowed URLs

- Add production **callback / logout / web origins** for the Railway frontend URL.

---

## 10. Security & compliance notes (short)

- **HTTPS only** in production.
- **Tokens:** Prefer **short-lived access tokens**; no tokens in URL query strings.
- **PHI:** If profiles include clinical or insurance identifiers, ensure **encryption at rest** (Mongo Atlas), **access logging**, and **minimum necessary** in JWT claims.
- **Rotate** any secrets committed historically (Mongo URI, Auth0 client secret if using confidential clients — SPA uses public client, no secret in frontend).

---

## 11. TDD-aligned testing checklist

These scenarios should be covered by **automated** tests where possible (write the test **first**, per §3). Manual steps supplement CI, not replace it.

| Layer | Test |
|-------|------|
| Unit | JWT validation with mocked JWKS / fixed test tokens |
| Integration | FastAPI `TestClient`: protected route returns 401 without token, 200 with valid mocked JWT |
| Frontend unit | Mocked Auth0 + assert `Authorization` header on API calls |
| E2E (manual) | Login via Auth0 → map loads → estimate call includes Bearer → profile save/load |
| Deploy / smoke | Health + providers JSON from production URLs; Docker `import app.main` after prod `requirements.txt` only |

---

## 12. Suggested implementation order (TDD at each step)

1. Fix **`requirements.txt`** + add **failing-then-passing** Docker / import smoke test (**unblocks API**).  
2. Confirm **CORS** + **`VITE_API_BASE_URL`** on Railway (**unblocks frontend data**).  
3. Auth0 Dashboard: SPA + API + URLs.  
4. Frontend: **tests for tokenized `fetch`** → Auth0 provider + API client implementation.  
5. Backend: **tests for JWT dependency and protected routes** → JWT verifier + `GET/PATCH /api/users/me` + Mongo upsert.  
6. Refactor `AuthContext` to composite state + Auth0 session (keep tests green).  
7. Remove dead password-auth code paths (delete tests only if routes removed).  
8. CI: Docker build or `requirements.txt`-only smoke test so prod deps cannot drift again.

---

## 13. Files likely to change (reference only)

| Area | Paths |
|------|--------|
| Frontend | `frontend/src/main.tsx` or `App.tsx`, `context/AuthContext.tsx`, `api/client.ts`, `pages/Login.tsx`, `pages/Signup.tsx`, `vite-env.d.ts` |
| Backend | `app/config.py`, new `app/api/auth_deps.py` or similar, `app/routes/__init__.py`, `app/models/api.py`, user repository, **delete or fix** `app/routes/auth.py` |
| Ops | `backend/requirements.txt`, `backend/Dockerfile` (if install line changes), `.github/workflows/ci.yml`, README env table |

---

**End of plan.**
