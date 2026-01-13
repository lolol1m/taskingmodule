# Tasking Module - Keycloak Dockerfile
# Using official Keycloak image
FROM quay.io/keycloak/keycloak:latest

# Set admin credentials
ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin

# Expose Keycloak port
EXPOSE 8080

# Start Keycloak in development mode
CMD ["start-dev"]

