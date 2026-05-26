# Project Tangy official demo 
dated: `26/5/2026`
last commit from `redesign`: `13/4/2026`


This contains the current demo version

## Architecture
Deployment is done with docker-compose. It consists of 4 containers: frontend, backend, postgres and keycloak

### Frontend
It is accessed with http://localhost:5173 with an internal port of 8080. This is where users enter the app. The browser will redirect to keycloak for authentication before entering. Environment variables are passed in a config.js file which is usually mounted.

### Backend
It is accessed with http://localhost:5000 with an internal port of 5000. This python uvicorn backend routes frontend requests with keycloak/postgres. Frontend does not directly communicate with keycloak/postgres. Environment variables are normally passed from docker-compose during container run time. This version uses a hardcoded docker.config file as this is purely for demonstration.

### Keycloak
It is accessed with http://localhost:8080 with an internal port of 8080. It is the source of authentication. Environment variables are passed from docker-compose during container run time. These environment variables directly tie to the launching of keycloak

### Postgres
It is not accessible by the browser. This stores all tasking data and caches user data as well.