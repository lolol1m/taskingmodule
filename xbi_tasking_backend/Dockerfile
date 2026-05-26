# Build stage
FROM python:3.13-alpine AS builder

WORKDIR /app

RUN apk update 
    # apk add --no-cache ca-certificates && \
    # update-ca-certificates

# RUN apt-get update && \
#     apt-get install -y --no-install-recommends ca-certificates && \
#     apt-get clean && \
#     apt-get autoremove -y && \
#     apt-get upgrade -y

#Cert for talking to keycloak
# COPY certs/keycloak.crt /usr/local/share/ca-certificates/keycloak.crt
# COPY certs/keycloak.crt /etc/ssl/certs
# #Cert + key for HTTPS backend
# COPY certs/server.crt /certs/server.crt
# COPY certs/server.key /certs/server.key

# ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt


COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --prefix=/install

# Runtime stage
FROM python:3.13-alpine

WORKDIR /app

# RUN apk add --no-cache ca-certificates && \
#     update-ca-certificates

# ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

COPY --from=builder /install /usr/local

RUN mkdir -p /app/app/{./model_path, ./static/gallery}

COPY . .

RUN if [ ! -f docker.config ] && [ -f docker.config.example ]; then \
cp docker.config.example docker.config; \
fi

RUN adduser -D app && chown -R app:app /app
# USER app
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

# EXPOSE 5000

# # CMD ["update-ca-certificates"]
# CMD ["sh", "-c", "update-ca-certificates", "&&", "python", "main.py"]