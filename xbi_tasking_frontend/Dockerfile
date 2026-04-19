FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./
RUN npm install

COPY . .

RUN update-ca-certificates || true

ENV VITE_MUI_X_LICENSE_KEY=e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y
# ENV VITE_BACKEND_URL=http://localhost:5000
# ENV VITE_KEYCLOAK_URL=http://localhost:8080
# ENV VITE_KEYCLOAK_REALM=xbi-tasking
# ENV VITE_CLIENT_ID=xbi-tasking-frontend

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]