FROM xbi-keycloak:2.7

COPY ca_certs /opt/keycloak/conf/

CMD ["start-dev", "--import-realm", "--hostname=localhost", "--hostname-strict=false", "--https-certificate-file=/opt/keycloak/conf/keycloak.crt", "--https-certificate-key-file=/opt/keycloak/conf/keycloak.key"]
