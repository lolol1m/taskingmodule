"""
Keycloak Authentication Middleware for FastAPI

Layer 1 - Authentication:
  JWKS-only token validation (public key signature, no per-request Keycloak calls).
  Checks signature, issuer, audience/azp, and expiry.

Layer 2 - App Access Gate:
  Validates 'groups' claim contains the required app group.

Layer 3 - Authorization:
  Reads client roles from resource_access.<roles_client_id>.roles.
"""
from jose import jwt, JWTError
import os
import time
import logging
from typing import Optional, Union
import httpx
from config import get_config

logger = logging.getLogger("xbi_tasking_backend.keycloak_auth")


def _httpx_verify() -> Union[str, bool]:
    """
    httpx defaults to certifi's CA bundle, which doesn't include our self-signed
    Keycloak cert. Respect SSL_CERT_FILE / REQUESTS_CA_BUNDLE / KEYCLOAK_CA_BUNDLE
    if set, so the backend can trust the Keycloak container's cert.
    """
    for env_var in ("KEYCLOAK_CA_BUNDLE", "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE"):
        path = os.getenv(env_var)
        if path and os.path.exists(path):
            return path
    return True


class GroupAccessDeniedError(Exception):
    """Raised when a user's JWT is valid but they are not in the required application group."""
    pass


class KeycloakAuth:
    def __init__(self, config=None, eager=True):
        self._config = config or get_config()
        self.keycloak_url = self._config.getKeycloakURL()
        self.realm = self._config.getKeycloakRealm()
        self.client_id = self._config.getKeycloakClientID()
        self.allowed_client_ids = set(self._config.getKeycloakAllowedClientIDs())
        self.roles_client_id = self._config.getKeycloakRolesClientID()
        self.required_group = self._config.getKeycloakRequiredGroup()

        self.well_known_url = f"{self.keycloak_url}/realms/{self.realm}/.well-known/openid-configuration"
        self.jwks_url = None
        self.jwks_cache = None
        self.jwks_fetched_at = 0
        self.jwks_ttl_seconds = 3600

        if eager:
            self._load_public_key()

    # ── JWKS ─────────────────────────────────────────────────────────────────

    def _load_public_key(self):
        try:
            with httpx.Client(verify=_httpx_verify()) as client:
                response = client.get(self.well_known_url, timeout=5.0)
                if response.status_code == 200:
                    config = response.json()
                    self.jwks_url = config.get('jwks_uri')
        except Exception as e:
            logger.warning("Could not load Keycloak JWKS URL: %s", e)

    async def _get_jwks(self):
        if self.jwks_cache and (time.time() - self.jwks_fetched_at) < self.jwks_ttl_seconds:
            return self.jwks_cache
        if not self.jwks_url:
            self._load_public_key()
        if not self.jwks_url:
            return None
        async with httpx.AsyncClient(verify=_httpx_verify()) as client:
            response = await client.get(self.jwks_url, timeout=5.0)
            if response.status_code == 200:
                self.jwks_cache = response.json()
                self.jwks_fetched_at = time.time()
                return self.jwks_cache
        return None

    async def _get_signing_key(self, kid: str):
        jwks = await self._get_jwks()
        if not jwks or not jwks.get('keys'):
            return None
        for key in jwks['keys']:
            if key.get('kid') == kid:
                return key
        self.jwks_cache = None
        jwks = await self._get_jwks()
        if not jwks or not jwks.get('keys'):
            return None
        for key in jwks['keys']:
            if key.get('kid') == kid:
                return key
        return None

    # ── Validation helpers ───────────────────────────────────────────────────

    def _validate_issuer_audience(self, claims: dict) -> bool:
        expected_issuer = f"{self.keycloak_url}/realms/{self.realm}"
        issuer = claims.get("iss")
        if issuer and issuer != expected_issuer:
            logger.warning("Token issuer mismatch: %s", issuer)
            return False

        aud = claims.get("aud")
        azp = claims.get("azp")

        if not aud and not azp:
            logger.warning("Token missing both aud and azp")
            return False
        if aud:
            if isinstance(aud, list):
                if not (self.allowed_client_ids.intersection(set(aud)) or azp in self.allowed_client_ids):
                    logger.warning(
                        "Token audience missing allowed client_id: aud=%s azp=%s allowed=%s",
                        aud, azp, sorted(self.allowed_client_ids),
                    )
                    return False
            elif aud not in self.allowed_client_ids and azp not in self.allowed_client_ids:
                logger.warning(
                    "Token audience mismatch: aud=%s azp=%s allowed=%s",
                    aud, azp, sorted(self.allowed_client_ids),
                )
                return False
        return True

    def _validate_group(self, claims: dict) -> bool:
        groups = claims.get('groups', [])
        if not isinstance(groups, list):
            groups = []
        if self.required_group in groups or f"/{self.required_group}" in groups:
            return True
        logger.warning(
            "User %s not in required group '%s' (groups=%s)",
            claims.get('preferred_username'), self.required_group, groups,
        )
        return False

    def _extract_client_roles(self, claims: dict) -> list:
        resource_access = claims.get('resource_access', {})
        client_access = resource_access.get(self.roles_client_id, {})
        return client_access.get('roles', [])

    # ── Token verification ───────────────────────────────────────────────────

    async def verify_token(self, token: str) -> Optional[dict]:
        try:
            try:
                unverified = jwt.get_unverified_claims(token)
                exp = unverified.get('exp')
                if exp:
                    now = time.time()
                    leeway = 60
                    if exp < (now - leeway):
                        logger.info("Token expired exp=%s now=%s leeway=%s", exp, now, leeway)
                        return None
            except Exception as decode_error:
                logger.warning("Could not decode token for expiration check: %s", decode_error)

            header = jwt.get_unverified_header(token)
            kid = header.get('kid')
            alg = header.get('alg', 'RS256')
            key = await self._get_signing_key(kid) if kid else None
            if not key:
                logger.warning("No signing key found for kid=%s", kid)
                return None

            decoded = jwt.decode(
                token,
                key,
                # algorithms=[alg],
                algorithms=["RS256"],
                options={"verify_aud": False}
            )

            if not self._validate_issuer_audience(decoded):
                return None

            if not self._validate_group(decoded):
                raise GroupAccessDeniedError(
                    f"User '{decoded.get('preferred_username')}' is not a member of "
                    f"required group '{self.required_group}'"
                )

            client_roles = self._extract_client_roles(decoded)

            account_type = None
            if 'IA' in client_roles:
                account_type = 'IA'
            elif 'Senior II' in client_roles:
                account_type = 'Senior II'
            elif 'II' in client_roles:
                account_type = 'II'

            return {
                'sub': decoded.get('sub'),
                'preferred_username': decoded.get('preferred_username'),
                'email': decoded.get('email'),
                'groups': decoded.get('groups', []),
                'resource_access': decoded.get('resource_access', {}),
                'account_type': account_type,
                'roles': client_roles,
            }

        except JWTError as e:
            logger.warning("JWT validation failed: %s", e)
            return None
        except Exception as e:
            logger.exception("Error verifying token: %s", e)
            return None
