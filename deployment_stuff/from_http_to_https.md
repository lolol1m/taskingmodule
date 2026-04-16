Read https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors because CORS errors are almost guaranteed at setup

# From HTTP to HTTPS for keycloak and vite

Install openssl (using choco, for winget `winget search` first)

```
choco install openssl
```

Run the following command to generate self signed cert and private key:

```
openssl req -x509 -newkey rsa:2048  -keyout server.key -out server.crt -days 365 -config server.cnf -nodes
```

## For keycloak container (from port 8080 to 8443)

Create a single keycloak container (ensure key and crt are in same dir as you are running this) (If you hate security, use a dockerfile which bakes in your certs and prevent storing cert and key as volume)

```
docker run -d --name keycloak-https `
  -p 8443:8443 `
  -v $(pwd)/server.crt:/opt/keycloak/conf/server.crt `
  -v $(pwd)/server.key:/opt/keycloak/conf/server.key `
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin `
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin `
  quay.io/keycloak/keycloak:latest `
  start-dev `
  --https-certificate-file=/opt/keycloak/conf/server.crt `
  --https-certificate-key-file=/opt/keycloak/conf/server.key
```

Confirgure keycloak with realms, etc

save custom image:

```
docker commit keycloak-https xbi-keycloak:6.7
```

Refer to dockerfile here for setup


## For frontend container 


## For deployment (using IP addresses and usable over multiple machines)
create a .cnf file 

run (-out can be .pem or .crt its up to you, passphrase up to you, can be same name as your key/cert names)
```
openssl req -x509 -new -key server.key -out server.crt -days 365 -config server.cnf -nodes
```


