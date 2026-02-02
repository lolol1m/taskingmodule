"""
Keycloak Authentication Middleware for FastAPI
"""
from jose import jwt, JWTError
import time
import logging
from typing import Optional
import httpx
from config import get_config

logger = logging.getLogger("xbi_tasking_backend.keycloak_auth")

class KeycloakAuth:
    """
    Keycloak authentication handler for validating JWT tokens
    """
    
    def __init__(self, config=None, eager=True):
        # Get Keycloak configuration from provided config
        self._config = config or get_config()
        self.keycloak_url = self._config.getKeycloakURL()
        self.realm = self._config.getKeycloakRealm()
        self.client_id = self._config.getKeycloakClientID()
        self.client_secret = self._config.getKeycloakClientSecret()
        self.allowed_client_ids = set(self._config.getKeycloakAllowedClientIDs())
        
        # Construct the well-known endpoint to get JWKS
        self.well_known_url = f"{self.keycloak_url}/realms/{self.realm}/.well-known/openid-configuration"
        self.jwks_url = None
        self.jwks_cache = None
        self.jwks_fetched_at = 0
        self.jwks_ttl_seconds = 3600
        
        if eager:
            self._load_public_key()
    
    def _load_public_key(self):
        """
        Load the JWKS URL from Keycloak's well-known endpoint
        """
        try:
            # Get the JWKS URL from well-known configuration
            with httpx.Client() as client:
                response = client.get(self.well_known_url, timeout=5.0)
                if response.status_code == 200:
                    config = response.json()
                    self.jwks_url = config.get('jwks_uri')
        except Exception as e:
            logger.warning("Could not load Keycloak JWKS URL: %s", e)
            logger.warning("Token validation will use introspection endpoint instead")

    def _validate_issuer_audience(self, claims: dict) -> bool:
        expected_issuer = f"{self.keycloak_url}/realms/{self.realm}"
        issuer = claims.get("iss")
        if issuer and issuer != expected_issuer:
            logger.warning("Token issuer mismatch: %s", issuer)
            return False

        aud = claims.get("aud")
        azp = claims.get("azp")
        if aud:
            if isinstance(aud, list):
                if not (self.allowed_client_ids.intersection(set(aud)) or azp in self.allowed_client_ids):
                    logger.warning(
                        "Token audience missing allowed client_id: aud=%s azp=%s allowed=%s",
                        aud,
                        azp,
                        sorted(self.allowed_client_ids),
                    )
                    return False
            elif aud not in self.allowed_client_ids and azp not in self.allowed_client_ids:
                logger.warning(
                    "Token audience mismatch: aud=%s azp=%s allowed=%s",
                    aud,
                    azp,
                    sorted(self.allowed_client_ids),
                )
                return False
        return True

    async def _get_jwks(self):
        if self.jwks_cache and (time.time() - self.jwks_fetched_at) < self.jwks_ttl_seconds:
            return self.jwks_cache
        if not self.jwks_url:
            self._load_public_key()
        if not self.jwks_url:
            return None
        async with httpx.AsyncClient() as client:
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
        # Refresh JWKS once if key not found
        self.jwks_cache = None
        jwks = await self._get_jwks()
        if not jwks or not jwks.get('keys'):
            return None
        for key in jwks['keys']:
            if key.get('kid') == kid:
                return key
        return None
    
    async def verify_token(self, token: str) -> Optional[dict]:
        """
        Verify a JWT token using Keycloak's token introspection endpoint
        """
        try:
            import time
            # First, try to decode token to check expiration (without verification)
            try:
                decoded = jwt.get_unverified_claims(token)
                exp = decoded.get('exp')
                if exp:
                    now = time.time()
                    leeway = 60
                    if exp < (now - leeway):
                        logger.info("Token expired exp=%s now=%s leeway=%s", exp, now, leeway)
                        return None
            except Exception as decode_error:
                logger.warning("Could not decode token for expiration check: %s", decode_error)
            
            # Try local validation with JWKS first
            try:
                header = jwt.get_unverified_header(token)
                kid = header.get('kid')
                alg = header.get('alg', 'RS256')
                key = await self._get_signing_key(kid) if kid else None
                if key:
                    decoded = jwt.decode(
                        token,
                        key,
                        algorithms=[alg],
                        options={"verify_aud": False}
                    )
                    if not self._validate_issuer_audience(decoded):
                        return None
                    realm_access = decoded.get('realm_access', {})
                    realm_roles = realm_access.get('roles', [])
                    account_type = None
                    if 'IA' in realm_roles:
                        account_type = 'IA'
                    elif 'Senior II' in realm_roles:
                        account_type = 'Senior II'
                    elif 'II' in realm_roles:
                        account_type = 'II'
                    return {
                        'sub': decoded.get('sub'),
                        'preferred_username': decoded.get('preferred_username'),
                        'email': decoded.get('email'),
                        'realm_access': realm_access,
                        'resource_access': decoded.get('resource_access', {}),
                        'account_type': account_type,
                        'roles': realm_roles
                    }
            except JWTError as jwks_error:
                logger.warning("JWKS validation failed; falling back to introspection: %s", jwks_error)
            except Exception as jwks_error:
                logger.warning("JWKS validation error; falling back to introspection: %s", jwks_error)

            # Use token introspection endpoint (more reliable than JWKS for validation)
            introspection_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token/introspect"
            
            async with httpx.AsyncClient() as client:
                # Use client credentials from config
                data = {
                    'token': token,
                    'client_id': self.client_id,
                    'client_secret': self.client_secret
                }
                
                response = await client.post(
                    introspection_url,
                    data=data,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('active', False):
                        if not self._validate_issuer_audience(result):
                            return None
                        # Extract roles from token
                        realm_access = result.get('realm_access', {})
                        realm_roles = realm_access.get('roles', [])
                        
                        # Determine account type from roles (priority: IA > Senior II > II)
                        account_type = None
                        if 'IA' in realm_roles:
                            account_type = 'IA'
                        elif 'Senior II' in realm_roles:
                            account_type = 'Senior II'
                        elif 'II' in realm_roles:
                            account_type = 'II'
                        
                        # Token is valid, return the token info
                        return {
                            'sub': result.get('sub'),
                            'preferred_username': result.get('preferred_username'),
                            'email': result.get('email'),
                            'realm_access': realm_access,
                            'resource_access': result.get('resource_access', {}),
                            'account_type': account_type,  # Add account type for backward compatibility
                            'roles': realm_roles
                        }
                    else:
                        logger.info("Token introspection returned active=False")
                        return None
                else:
                    logger.warning(
                        "Keycloak introspection failed status=%s text=%s",
                        response.status_code,
                        response.text,
                    )
                    logger.debug("Introspection URL: %s", introspection_url)
                    logger.debug("Client ID: %s", self.client_id)
                    return None
                    
        except Exception as e:
            logger.exception("Error verifying token: %s", e)
            return None
    
