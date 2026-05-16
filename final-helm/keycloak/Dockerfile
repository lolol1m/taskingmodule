# FROM xbi-keycloak:prod-groups-hostname
FROM xbi-keycloak:ingress

COPY certs /opt/keycloak/conf/


ENV KC_BOOTSTRAP_ADMIN_USERNAME=admin
ENV KC_BOOTSTRAP_ADMIN_PASSWORD=admin
ENV KC_HOSTNAME=tangy.auth.local
ENV KC_PROXY=edge
ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true
RUN echo "Check that your host address is not localhost or 0.0.0.0"

# CMD ["start-dev", "--import-realm", "--hostname=ip_address", "--hostname-strict=false", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
# CMD ["start-dev", "--import-realm", "--hostname=tangy.auth.local", "--hostname-strict=false", "--proxy-headers=xforwarded", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
CMD ["start-dev", "--import-realm", "--hostname-strict=true", "--proxy-headers=xforwarded", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
