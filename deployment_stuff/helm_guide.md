## Load docker images in cluster

kubectl load

## Add relevant secrets

1. upload server cert and key as secret for frontend and backend

In the directory with server cert and key (e.g backend certs/ folder)
kubectl create secret tls server-tls `
   --cert=server.crt `
   --key=server.key

2. upload keycloak cert and key as secret for keycloak

In the directory with keycloak cert and key (e.g keycloak ca-certs/ folder)
kubectl create secret tls keycloak-tls `
   --cert=keycloak.crt `
   --key=keycloak.key

3. upload just keycloak ca cert as secret for backend mount 
In the directory with keycloak cert and key (e.g keycloak ca-certs/ folder)
kubectl create secret tls keycloak-ca `
   --cert=keycloak.crt `

4. create secret for ingress 
from any ca cert:
kubectl create secret generic ingress-ca-secret --from-file=ca.crt=ca.crt


