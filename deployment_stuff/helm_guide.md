## Create cluster

kind create cluster --name tm-rfo

## Load docker images in cluster

kind load tm-frontend:latest --name tm-rfo
kind load tm-backend:latest --name tm-rfo

## Configure ingress NGINX controller

kubectl create namespace ingress-nginx

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx


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


To check if keycloak crt is same for both keycloak-ca and keycloak-tls,
# Fetch and parse both secrets
$secret1 = kubectl get secret secret-one -o json | ConvertFrom-Json
$secret2 = kubectl get secret secret-two -o json | ConvertFrom-Json

# Extract the base64 strings
$cert1Base64 = $secret1.data.'ca.crt'
$cert2Base64 = $secret2.data.'ca.crt'

# Compare the raw base64 data strings directly
$cert1Base64 -eq $cert2Base64
