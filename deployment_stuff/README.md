# HOSTING WITH IP ADDRESS

Ensure you have the following (based on my repo):

ca_certs folder in xbi-keycloak with the keycloak crt and key (make it using `openssl req -x509 -newkey rsa:2048  -keyout keycloak.key -out keycloak.crt -days 365 -config keycloak.cnf -nodes`)
- Configure the CN or SAN to include your host ip address if needed (keycloak with CN=localhost should work)
- Ensure Dockerfile in xbi-keycloak --hostname is your host ip address

certs folder in xbi_tasking_backend with same keycloak crt and server crt + key (make server key+cert with openssl req -x509 -newkey rsa:2048  -keyout server.key -out server.crt -days 365 -config keycloak.cnf -nodes)
- Ensure that CN in server.cnf is your *host ip address*, refer to server_template.cnf under xbi_tasking_backend for config 

certs folder in xbi_tasking_frontend with the same keycloak crt + key
