# FROM xbi-keycloak:prod-groups-hostname
FROM tm-keycloak:demo

# COPY ca_certs /opt/keycloak/conf/

RUN echo "Check that your host address is not localhost or 0.0.0.0"
# CMD ["start-dev", "--import-realm", "--hostname=ip_address", "--hostname-strict=false", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
# CMD ["start-dev", "--import-realm", "--hostname-strict=true", "--proxy-headers=xforwarded", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
# Run this to prevent conficts with set environment variables
CMD ["start-dev", "--import-realm"]