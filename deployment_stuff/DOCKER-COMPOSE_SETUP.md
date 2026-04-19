# Guide to dockerize tasking module with docker-compose

## If you use an existing Keycloak container for testing locally (with realms and other setting configured)

### ALSO DOES NOT WORK FOR DOCKER_COMPOSE CONTAINER, USE AN ISOLATED ONE
Converting keycloak container into custom image to store data
```
docker commit funny_container_name xbi-keycloak:custom
```

container name: `xbi-keycloak-original` (docker rename to change name to allow docker-compose to build container 'xbi-keycloak')

## Preparing Frontend for building with Docker
### 1. Create Dockerfile in frontend root (./xbi-ui/) :
```
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Setup .dockerignore in same dir as Dockerfile:
    - Add to it as needed
```
.gitignore
node_modules/
```
## Preparing Backend for building with Docker
### 1. Create Dockerfile in backend root (./xbi_tasking_backend/):
```
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "main.py"]
```
### 2. Setup .dockerignore in same dir as Dockerfile:

```
venv/
code/
*.bat
dev_server.config

.gitignore

# Testing stuff
testing/
testing.config
unittesting.py
```
## Create docker-compose.yml in root dir with frontend and backend roots (./)
    - Configure your build, environment variables as needed 
```
version: "3.9"

services:

  frontend:
    build: ./xbi-ui
    # Use image instead of build once you have image loaded
    # image: taskingmodule-frontend
    container_name: xbi-frontend
    depends_on:
      - backend
    environment:
      REACT_APP_DB_API_URL: http://localhost:5000
      # REACT_APP_DB_API_URL: http://backend:5000
    ports:
      - "3000:3000"

  backend:
    build: ./xbi_tasking_backend
    # Use image instead of build once you have image loaded
    # image: taskingmodule-backend
    container_name: xbi-backend
    depends_on:
      postgres:
        condition: service_healthy
      keycloak:
        condition: service_started
    environment:
      # Database
      DB_HOST: postgres
      DB_NAME: XBI_TASKING_3
      DB_USER: postgres
      DB_PASSWORD: password

      # Keycloak 
      KEYCLOAK_PUBLIC_URL: http://localhost:8080
      KEYCLOAK_INTERNAL_URL: http://keycloak:8080
      KEYCLOAK_REALM: xbi-tasking
      KEYCLOAK_CLIENT_ID: xbi-tasking-backend
      KEYCLOAK_CLIENT_SECRET: Zj7CYgoGf7pOuW18fEcmNFwI7HIK1k0K
      KEYCLOAK_ADMIN_CLIENT_ID: xbi-tasking-admin
      KEYCLOAK_ADMIN_CLIENT_SECRET: 9YMbyTXVTpjPErz8jGwmWtjwfsNDnont
      KEYCLOAK_ENABLED: "true"

    ports:
      - "5000:5000"


  postgres:
    image: postgres:15.6
    container_name: xbi-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: XBI_TASKING_3
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres "]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data
      # - ./backend/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"


  keycloak:
    image: xbi-keycloak:custom
    container_name: xbi-keycloak
    command: 
    - start-dev
    - --import-realm
    - --hostname=localhost
    - --hostname-strict=false
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - "8080:8080"
    volumes:
      - keycloak_data:/opt/keycloak/data

volumes:
  pgdata:
  keycloak_data:

```


## Infrastructure changes from commit "cleanup":
Keycloak has public url (localhost for browser use) and internal url (for KC container to communicate with backend)
ConfigClass now takes env variables which are configured in docker compose
In requirements.txt: psycopg2 -> psycopg2-binary (import statements need not be changed)

Why psycopg2-binary: You must have GCC / build tools, libpq-dev installed for psycopg2 (not useful in use case for docker containers which are air gapped)

### Issues right now

Currently backend triees to connect to postgres too early as depends_on does not wait, hence healthchecks on backend and postgres

Might need help to check volumes for postgres and keycloak (idk if needed)