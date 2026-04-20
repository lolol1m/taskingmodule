# Keycloak Setup (Docker deployment)

This guide covers the Keycloak realm/clients/roles configuration for the **Docker Compose deployment** (hostnames `tangy.local` / `tangy.auth.local`).

> If you haven't run the stack yet, start with [`SETUP.md`](../SETUP.md) first. You need Keycloak running on `https://tangy.auth.local:8443` before the steps below work.

---

## Prerequisites

- `docker compose up -d` is running and `docker compose ps` shows `xbi-keycloak-trial-2` as **Up**
- `tangy.auth.local` resolves to `127.0.0.1` (handled by `setup.ps1`)
- Self-signed certificate accepted: visit `https://tangy.auth.local:8443` once and click **Advanced** → **Proceed**
- Bootstrap admin credentials (see `docker-compose.yml`):
  - Username: `admin`
  - Password: `admin`

URLs referenced in this doc:

| What | URL |
|---|---|
| Keycloak admin console | `https://tangy.auth.local:8443/admin` |
| Frontend | `http://tangy.local:5173` |
| Backend | `http://tangy.local:5000` |

---

## 1. Create / select the realm

1. Open `https://tangy.auth.local:8443/admin` and sign in as `admin` / `admin`.
2. In the realm dropdown (top-left), click **Create realm** (or select it if it already exists).
3. **Realm name**: `xbi-tasking` → **Create**.

All remaining steps are done **inside the `xbi-tasking` realm**.

---

## 2. Configure the frontend client (public)

The frontend uses the Keycloak JavaScript adapter directly (login-required + PKCE). It is a **public** client — no client secret.

1. **Clients** → **Create client**.
2. **General settings**:
   - Client type: `OpenID Connect`
   - Client ID: `xbi-tasking-frontend`
   - → **Next**
3. **Capability config**:
   - Client authentication: **OFF** (public client)
   - Authentication flow: **Standard flow** ON, **Direct access grants** OFF
   - → **Next**
4. **Login settings**:
   - Root URL: `http://tangy.local:5173`
   - Home URL: `http://tangy.local:5173`
   - Valid redirect URIs:
     ```
     http://tangy.local:5173/*
     ```
   - Valid post logout redirect URIs:
     ```
     http://tangy.local:5173/*
     ```
   - Web origins:
     ```
     http://tangy.local:5173
     ```
   - → **Save**

> **About PKCE**: the Keycloak JS adapter on the frontend always sends `code_challenge_method=S256`, so the Authorization Code flow is PKCE-protected out of the box — no server-side toggle required. Recent Keycloak versions have even removed the "enforce PKCE" dropdown from the UI. If your version *does* expose a **Proof Key for Code Exchange Code Challenge Method** field (Advanced tab), you can set it to `S256` to also block any future non-PKCE client, but this is optional.

---

## 3. Configure the backend client (confidential)

The backend uses this client to introspect tokens. It does **not** run a browser redirect flow.

1. **Clients** → **Create client**.
2. **General settings**:
   - Client type: `OpenID Connect`
   - Client ID: `xbi-tasking-backend`
   - → **Next**
3. **Capability config**:
   - Client authentication: **ON** (confidential)
   - Standard flow: **OFF** (token introspection only)
   - Direct access grants: **OFF**
   - Service accounts roles: **OFF** (not needed here — admin is a separate client)
   - → **Next**
4. **Login settings**: leave everything blank → **Save**.
5. **Credentials** tab → copy **Client secret**.
6. Paste it into `xbi_tasking_backend/docker.config` under `[Keycloak] → client_secret`, AND into `docker-compose.yml` under `KEYCLOAK_CLIENT_SECRET`. (Environment variables in compose override the config file.)

---

## 4. Configure the admin client (service account)

Required for the `/getUsers` endpoint and password management via the Keycloak admin API.

1. **Clients** → **Create client**.
2. **General settings**:
   - Client type: `OpenID Connect`
   - Client ID: `xbi-tasking-admin`
   - → **Next**
3. **Capability config**:
   - Client authentication: **ON**
   - Standard flow: **OFF**
   - Direct access grants: **ON** (needed for password reset)
   - Service accounts roles: **ON**
   - → **Next**
4. **Login settings**: leave blank → **Save**.
5. **Credentials** tab → copy **Client secret** into `docker.config` (`admin_client_secret`) and `docker-compose.yml` (`KEYCLOAK_ADMIN_CLIENT_SECRET`).
6. **Service account roles** tab → **Assign role** → filter **Clients** = `realm-management` → assign:
   - `view-users`
   - `query-users`
   - `view-realm`
   - `manage-users`

---

## 5. Realm roles

**Realm roles** → **Create role** — create each of:

- `II`
- `Senior II`
- `IA`

These are used by `UserService.hasRole([...])` on the frontend.

---

## 6. Required group (`xbi-tasking-users`)

The backend enforces `required_group: xbi-tasking-users` — every user must belong to this group or the backend returns 401.

### 6a. Create the group

1. **Groups** → **Create group**
2. Name: `xbi-tasking-users` → **Create**

### 6b. Add the `groups` claim to the frontend token

The backend reads the group list from the JWT `groups` claim. That claim is not emitted by default — you need a mapper on the frontend client's dedicated scope:

1. **Clients** → `xbi-tasking-frontend` → **Client scopes** tab
2. Open `xbi-tasking-frontend-dedicated`
3. **Configure New mapper** → **Group Membership**
4. Configure:
   - Name: `groups`
   - Token Claim Name: `groups`
   - Full group path: **OFF** (so the claim is `xbi-tasking-users`, not `/xbi-tasking-users`)
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
5. → **Save**

### 6c. Verify the claim appears

> **Do this after section 7** — you need at least one user who is a member of `xbi-tasking-users` before the check is meaningful.

1. **Clients** → `xbi-tasking-frontend` → **Client scopes** tab → **Evaluate**
2. Select a user who is in `xbi-tasking-users`
3. Click **Generated access token** → confirm `"groups": ["xbi-tasking-users"]` is present (without a leading `/`)

---

## 7. Create users

1. **Users** → **Create new user**
2. Username, email (optional)
3. **Credentials** tab → set a password (uncheck *Temporary* for dev)
4. **Groups** tab → **Join Group** → `xbi-tasking-users`
5. **Role mapping** tab → **Assign role** → filter **Realm roles** → assign one of `II`, `Senior II`, or `IA`

Repeat for every user that should access the app.

---

## 8. Realm settings

**Realm settings** → **Login** tab:

- **Edit username**: **ON** (required if you want to change usernames later)
- **Forgot password**, **Remember me**, etc.: optional

→ **Save**

---

## Backend configuration

The backend reads `xbi_tasking_backend/docker.config` inside the container (set via `CONFIG_PATH=docker.config` in `docker-compose.yml`). Start from the tracked template:

```ini
[Keycloak]
keycloak_url: https://tangy.auth.local:8443
realm: xbi-tasking
client_id: xbi-tasking-backend
client_secret: <paste from xbi-tasking-backend → Credentials>
admin_client_id: xbi-tasking-admin
admin_client_secret: <paste from xbi-tasking-admin → Credentials>
allowed_client_ids: xbi-tasking-frontend, xbi-tasking-backend, xbi-tasking-admin
roles_client_id: xbi-tasking-frontend
required_group: xbi-tasking-users
mode: prod
```

`docker-compose.yml` also sets these as environment variables (which take precedence):

- `KEYCLOAK_PUBLIC_URL=https://tangy.auth.local:8443`
- `KEYCLOAK_INTERNAL_URL=https://keycloak:8443` (service-to-service name on the Docker network)
- `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ADMIN_CLIENT_SECRET`

After any change, rebuild the backend:

```powershell
docker compose up -d --build backend
```

---

## Frontend configuration

The frontend reads Keycloak details from Vite env vars set in `docker-compose.yml`:

```yaml
VITE_KEYCLOAK_URL: https://tangy.auth.local:8443
VITE_KEYCLOAK_REALM: xbi-tasking
VITE_CLIENT_ID: xbi-tasking-frontend
VITE_BACKEND_URL: http://tangy.local:5000
```

After changing any `VITE_*` value, rebuild:

```powershell
docker compose up -d --build frontend
```

---

## How authentication works (current implementation)

1. Browser loads `http://tangy.local:5173`.
2. `UserService.initKeycloak()` calls the Keycloak JS adapter with `onLoad: 'login-required'` + `pkceMethod: 'S256'`.
3. Adapter redirects the browser to `https://tangy.auth.local:8443/realms/xbi-tasking/protocol/openid-connect/auth?...`.
4. User logs in; Keycloak redirects back to `http://tangy.local:5173/?code=...` (allowed by the client's redirect URIs).
5. Adapter exchanges the code for tokens (PKCE — no client secret needed).
6. Frontend calls the backend with `Authorization: Bearer <access_token>`.
7. Backend middleware introspects the token at Keycloak (using the `xbi-tasking-backend` client credentials), checks:
   - Token signature / expiry
   - `azp` (authorized party) is in `allowed_client_ids`
   - `groups` contains `required_group` (`xbi-tasking-users`)
   - Realm roles → mapped to account type (`II`, `Senior II`, `IA`)
8. If anything fails → 401.

`checkLoginIframe` is disabled on the frontend — browsers increasingly block third-party cookies in iframes, which breaks Keycloak's session-check iframe when frontend (`http://`) and Keycloak (`https://`) are on different schemes. Token renewal uses `updateToken(5)` instead.

---

## Testing

```powershell
.\setup.ps1
docker compose up -d --build

# Accept the self-signed cert once
Start-Process "https://tangy.auth.local:8443"

# Then open the app
Start-Process "http://tangy.local:5173"
```

Expected:

1. Frontend briefly shows a loader, then redirects to Keycloak.
2. Login as a user in `xbi-tasking-users` with a realm role.
3. Keycloak redirects back to `http://tangy.local:5173`.
4. App loads; network tab shows calls to `http://tangy.local:5000` with an `Authorization` header, all returning `200`.

---

## Troubleshooting

### "Invalid parameter: redirect_uri"
The URL the adapter is sending doesn't match `Valid redirect URIs` on `xbi-tasking-frontend`. Make sure it includes `http://tangy.local:5173/*` (trailing `*` matters).

### CORS error in browser console
Add `http://tangy.local:5173` to **Web origins** on `xbi-tasking-frontend`. `+` is also valid (copies allowed origins from redirect URIs).

### Frontend stuck on "Initialising..."
Most commonly the Keycloak cert hasn't been trusted yet. Open `https://tangy.auth.local:8443` manually and accept the warning. Also confirm `checkLoginIframe: false` is set in `xbi_tasking_frontend/src/auth/UserService.js`.

### Backend returns 401 on every request
- User missing from `xbi-tasking-users` group → add them (step 7).
- `groups` claim missing from token → re-check the mapper (step 6b), then click **Evaluate** (step 6c).
- Client secret mismatch → re-copy from **Credentials** tab into both `docker.config` and `docker-compose.yml`, then `docker compose up -d --build backend`.

### `401 Client Error: Unauthorized` when calling `/getUsers`
- `xbi-tasking-admin` client is missing or missing service account roles. Redo step 4 and verify **Service account roles** includes `view-users`, `query-users`, `view-realm`, `manage-users`.

### "Token validation failed" in backend logs
- Backend can't reach Keycloak. Compose uses `KEYCLOAK_INTERNAL_URL=https://keycloak:8443` (service DNS) for introspection. Check `docker compose logs keycloak` is healthy.
- Backend trust store doesn't contain the Keycloak cert: it's copied in by the backend `Dockerfile` from `certs/keycloak.crt`. If you regenerated the Keycloak cert, re-run `setup.ps1` and rebuild: `docker compose up -d --build backend`.

### Redirect loop between frontend and Keycloak
Clear browser storage for both `http://tangy.local:5173` and `https://tangy.auth.local:8443`, then reload. Also check browser console for adapter errors.

---

## Security notes

1. **HTTPS in production**: the current stack serves the frontend over plain `http://`. For anything beyond local dev, put Vite behind a reverse proxy with a proper TLS cert.
2. **Self-signed cert**: `deployment_stuff/xbi-keycloak/ca_certs/keycloak.crt` is checked into git for portability. In production, replace it with a cert from a real CA.
3. **Client secrets in compose**: `KEYCLOAK_CLIENT_SECRET` and `KEYCLOAK_ADMIN_CLIENT_SECRET` are currently hard-coded in `docker-compose.yml`. Move them to a `.env` file (and add `.env` to `.gitignore`) before pushing anywhere shared.
4. **PKCE (`S256`)** is enforced on the frontend client — there is no `implicit` flow.
5. **Token storage**: the JS adapter keeps tokens in memory; they're not persisted to `localStorage`, which is the Keycloak-recommended default.

---

## Additional resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak JavaScript Adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- Stack setup on a new machine: [`SETUP.md`](../SETUP.md)
