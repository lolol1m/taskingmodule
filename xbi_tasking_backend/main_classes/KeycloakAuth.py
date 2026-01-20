"""
Keycloak Authentication Middleware for FastAPI
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import time
import os
from typing import Optional
import httpx
from main_classes import ConfigClass

class KeycloakAuth:
    """
    Keycloak authentication handler for validating JWT tokens
    """
    
    def __init__(self):
        # Get Keycloak configuration from ConfigClass
        config = ConfigClass._instance
        self.keycloak_url = config.getKeycloakURL()
        self.realm = config.getKeycloakRealm()
        self.client_id = config.getKeycloakClientID()
        self.client_secret = config.getKeycloakClientSecret()
        
        # Construct the well-known endpoint to get JWKS
        self.well_known_url = f"{self.keycloak_url}/realms/{self.realm}/.well-known/openid-configuration"
        self.jwks_url = None
        self.jwks_cache = None
        self.jwks_fetched_at = 0
        self.jwks_ttl_seconds = 3600
        
        # Prime JWKS URL
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
            print(f"Warning: Could not load Keycloak JWKS URL: {e}")
            print("Token validation will use introspection endpoint instead")

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
                    if exp < now:
                        print(f"❌ Token expired. Exp: {exp}, Now: {now}, Diff: {now - exp} seconds")
                        return None
            except Exception as decode_error:
                print(f"⚠️  Could not decode token for expiration check: {decode_error}")
            
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
                print(f"⚠️  JWKS validation failed, falling back to introspection: {jwks_error}")
            except Exception as jwks_error:
                print(f"⚠️  JWKS validation error, falling back to introspection: {jwks_error}")

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
                        print(f"❌ Token introspection returned active=False. Result: {result}")
                        return None
                else:
                    print(f"❌ Keycloak introspection failed: {response.status_code}")
                    print(f"   Response text: {response.text}")
                    print(f"   Introspection URL: {introspection_url}")
                    print(f"   Client ID: {self.client_id}")
                    return None
                    
        except Exception as e:
            print(f"Error verifying token: {e}")
            return None
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials) -> dict:
        """
        Extract and validate token from Authorization header
        """
        token = credentials.credentials
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify token
        token_info = await self.verify_token(token)
        
        if not token_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return token_info

# Create instance
keycloak_auth = KeycloakAuth()

# Create HTTPBearer security scheme
security = HTTPBearer()

# Dependency function for FastAPI routes
async def get_current_user(credentials: HTTPAuthorizationCredentials = security):
    """
    FastAPI dependency to get current authenticated user
    Usage: Add this as a dependency to any route that requires authentication
    Example: @app.get("/protected", dependencies=[Depends(get_current_user)])
    """
    return await keycloak_auth.get_current_user(credentials)


