FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    apt-get clean && \
    apt-get autoremove -y

#Cert for talking to keycloak
COPY certs/keycloak.crt /usr/local/share/ca-certificates/keycloak.crt
COPY certs/keycloak.crt /etc/ssl/certs
#Cert + key for HTTPS backend
COPY certs/server.crt /certs/server.crt
COPY certs/server.key /certs/server.key

ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

RUN update-ca-certificates

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN if [ ! -f docker.config ] && [ -f docker.config.example ]; then \
        cp docker.config.example docker.config; \
    fi

EXPOSE 5000
CMD ["python", "main.py"]