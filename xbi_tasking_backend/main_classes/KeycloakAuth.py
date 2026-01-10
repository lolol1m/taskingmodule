"""
Keycloak Authentication Middleware for FastAPI
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
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
        
        # Construct the well-known endpoint to get public key
        self.well_known_url = f"{self.keycloak_url}/realms/{self.realm}/.well-known/openid-configuration"
        self.jwks_url = None
        self.public_key = None
        
        # Cache for public key (in production, you might want to refresh this periodically)
        self._load_public_key()
    
    def _load_public_key(self):
        """
        Load the public key from Keycloak's JWKS endpoint
        """
        try:
            # Get the JWKS URL from well-known configuration
            with httpx.Client() as client:
                response = client.get(self.well_known_url, timeout=5.0)
                if response.status_code == 200:
                    config = response.json()
                    self.jwks_url = config.get('jwks_uri')
                    
                    # Get the public key from JWKS
                    if self.jwks_url:
                        jwks_response = client.get(self.jwks_url, timeout=5.0)
                        if jwks_response.status_code == 200:
                            jwks = jwks_response.json()
                            # For simplicity, we'll use the first key
                            # In production, you should match the key by 'kid' from the token header
                            if jwks.get('keys'):
                                key = jwks['keys'][0]
                                # Convert JWK to PEM format (simplified - you might need a library for this)
                                # For now, we'll validate using Keycloak's token introspection endpoint
                                self.public_key = key
        except Exception as e:
            print(f"Warning: Could not load Keycloak public key: {e}")
            print("Token validation will use introspection endpoint instead")
    
    async def verify_token(self, token: str) -> Optional[dict]:
        """
        Verify a JWT token using Keycloak's token introspection endpoint
        """
        try:
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
                        return None
                else:
                    print(f"Keycloak introspection failed: {response.status_code} - {response.text}")
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


