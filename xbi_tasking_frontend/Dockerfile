# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./

RUN npm ci

# uncomment for local testing, but replace ensure meta.env used
# ARG VITE_BACKEND_URL
# ARG VITE_KEYCLOAK_URL
# ARG VITE_KEYCLOAK_REALM
# ARG VITE_CLIENT_ID
# ARG VITE_ROLES_CLIENT_ID

# # --- CONVERT ARGS TO ENVS FOR VITE ---
# ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
# ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
# ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
# ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
# ENV VITE_ROLES_CLIENT_ID=$VITE_ROLES_CLIENT_ID
ENV VITE_MUI_X_LICENSE_KEY=e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y

COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# RUN npm install

# COPY . .
# ENV VITE_BACKEND_URL=http://localhost:5000
# ENV VITE_KEYCLOAK_URL=http://localhost:8080
# ENV VITE_KEYCLOAK_REALM=xbi-tasking
# ENV VITE_CLIENT_ID=xbi-tasking-frontend

RUN mkdir -p \
    /tmp/client_temp \
    /tmp/proxy_temp \
    /tmp/fastcgi_temp \
    /tmp/uwsgi_temp \
    /tmp/scgi_temp \
    && chmod -R 777 /tmp
    
USER 1001

# EXPOSE 5173
EXPOSE 8080
# CMD ["update-ca-certificates", "||", "true"]
# CMD ["npm", "run", "preview", "--", "--host"]
CMD ["nginx", "-g", "daemon off;"]