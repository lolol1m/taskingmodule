# Frontend
VITE_MUI_X_LICENSE_KEY: e0d9bb8070ce0054c9d9ecb6e82cb58fTz0wLEU9MzI0NzIxNDQwMDAwMDAsUz1wcmVtaXVtLExNPXBlcnBldHVhbCxLVj0y
VITE_BACKEND_URL: http://localhost:5000
VITE_KEYCLOAK_URL: http://localhost:8080
VITE_KEYCLOAK_REALM: xbi-tasking
VITE_CLIENT_ID: xbi-tasking-frontend




# For backend
[Database]
database_name: XBI_TASKING_3
ip_address: localhost (Or correct ip_addr)
port: 5432
// Your own psql user/pass
user: postgres 
password: password
// auto_init_db: true

[Keycloak]
keycloak_url: http://localhost:8080
realm: xbi-tasking
client_id: xbi-tasking-backend
client_secret: (your_backend_secret)
admin_client_id: xbi-tasking-admin
admin_client_secret: (your admin secret)
allowed_client_ids: xbi-tasking-backend, xbi-tasking-frontend

# PostgresSQL
Your user, password of your choice and the db you are using
POSTGRES_USER: postgres
POSTGRES_PASSWORD: password
POSTGRES_DB: XBI_TASKING_3

# Keycloak
KEYCLOAK_ADMIN and KEYCLOAK_ADMIN_PASSWORD are whatever your user and password is to access keycloak

