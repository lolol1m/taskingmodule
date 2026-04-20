# Docker setup

This is the full flow to get the stack running on a fresh machine.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

## One-time setup

From the repo root, in **PowerShell**:

```powershell
.\setup.ps1
docker compose up -d --build
```

`setup.ps1` is idempotent. It will:

1. Verify Docker is running.
2. Tag `quay.io/keycloak/keycloak:latest` as `xbi-keycloak:hostname` (the local tag the Keycloak Dockerfile expects).
3. Create `xbi_tasking_backend/docker.config` from `docker.config.example` if missing.
4. Populate `xbi_tasking_backend/certs/` (copies `keycloak.crt` from `deployment_stuff/xbi-keycloak/ca_certs/`, generates `server.crt`/`server.key` via a throwaway `alpine/openssl` container).
5. Add `tangy.local` and `tangy.auth.local` to your Windows hosts file (will prompt for UAC).

If the hosts step can't elevate, add these lines to `C:\Windows\System32\drivers\etc\hosts` manually:

```
127.0.0.1 tangy.local
127.0.0.1 tangy.auth.local
```

## Trusting the Keycloak self-signed certificate

Open `https://tangy.auth.local:8443` in your browser, click **Advanced** → **Proceed to tangy.auth.local (unsafe)**. Chrome will remember this for the session.

## Open the app

- Frontend: http://tangy.local:5173
- Backend health: http://tangy.local:5000
- Keycloak: https://tangy.auth.local:8443

## Everyday commands

| Action | Command |
|---|---|
| Start | `docker compose up -d` |
| Start + rebuild | `docker compose up -d --build` |
| Rebuild one service | `docker compose up -d --build frontend` |
| Stop | `docker compose down` |
| Stop + wipe DB/Keycloak state | `docker compose down -v` |
| Status | `docker compose ps` |
| Live logs | `docker compose logs -f` |
| One service logs | `docker compose logs -f backend` |
| Shell into container | `docker compose exec backend bash` |

## Quick health check

```powershell
curl.exe -s -o NUL -w "frontend:%{http_code}`n" http://tangy.local:5173/
curl.exe -s -o NUL -w "backend:%{http_code}`n"  http://tangy.local:5000/
curl.exe -k -s -o NUL -w "keycloak:%{http_code}`n" https://tangy.auth.local:8443/realms/master
```

All three should return `200`.

## What's in git and what isn't

Tracked:
- `docker-compose.yml`, all service Dockerfiles
- `xbi_tasking_backend/docker.config.example`
- `deployment_stuff/xbi-keycloak/ca_certs/keycloak.crt` and `keycloak.key`
- Source code

Generated locally by `setup.ps1` (not tracked):
- `xbi_tasking_backend/docker.config`
- `xbi_tasking_backend/certs/keycloak.crt`
- `xbi_tasking_backend/certs/server.crt`
- `xbi_tasking_backend/certs/server.key`

If you wipe your working tree, just run `setup.ps1` again.
