FROM xbi-keycloak:hostname

COPY ca_certs /opt/keycloak/conf/

RUN echo "Check that your host address is not localhost or 0.0.0.0"
# CMD ["start-dev", "--import-realm", "--hostname=ip_address", "--hostname-strict=false", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
CMD ["start-dev", "--import-realm", "--hostname=tangy.auth.local", "--hostname-strict=false", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
