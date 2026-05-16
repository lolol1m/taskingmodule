# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./

RUN npm ci

ARG VITE_BACKEND_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_CLIENT_ID
ARG VITE_ROLES_CLIENT_ID

# --- CONVERT ARGS TO ENVS FOR VITE ---
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
ENV VITE_ROLES_CLIENT_ID=$VITE_ROLES_CLIENT_ID
ENV VITE_MUI_X_LICENSE_KEY=e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y

COPY . .
RUN npm run build

# Runtime stage
FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app .

# RUN npm install

# COPY . .
# ENV VITE_BACKEND_URL=http://localhost:5000
# ENV VITE_KEYCLOAK_URL=http://localhost:8080
# ENV VITE_KEYCLOAK_REALM=xbi-tasking
# ENV VITE_CLIENT_ID=xbi-tasking-frontend


RUN adduser -D app && chown -R app:app /app
USER app

# EXPOSE 5173
EXPOSE 4173
# CMD ["update-ca-certificates", "||", "true"]
CMD ["npm", "run", "preview", "--", "--host"]