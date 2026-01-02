/**
 * Hook to get the current user's role from Keycloak token
 * Returns: 'II', 'Senior II', 'IA', or null
 */
import { useState, useEffect } from 'react';
import keycloak from './keycloak';

export default function useKeycloakRole() {
    const [role, setRole] = useState(null);
    
    useEffect(() => {
        const getRole = () => {
            if (!keycloak.authenticated || !keycloak.tokenParsed) {
                return null;
            }
            
            // Get roles from token
            // Keycloak stores roles in realm_access.roles or resource_access
            const realmRoles = keycloak.tokenParsed.realm_access?.roles || [];
            const resourceRoles = keycloak.tokenParsed.resource_access?.[keycloak.clientId]?.roles || [];
            const allRoles = [...realmRoles, ...resourceRoles];
            
            // Check for account type roles (II, Senior II, IA)
            // Priority: IA > Senior II > II
            if (allRoles.includes('IA')) {
                return 'IA';
            } else if (allRoles.includes('Senior II')) {
                return 'Senior II';
            } else if (allRoles.includes('II')) {
                return 'II';
            }
            
            // Fallback: Check if username contains role info
            const username = keycloak.tokenParsed.preferred_username || keycloak.tokenParsed.sub || '';
            if (username.toLowerCase().includes('ia')) {
                return 'IA';
            } else if (username.toLowerCase().includes('senior_ii') || username.toLowerCase().includes('senior ii')) {
                return 'Senior II';
            } else if (username.toLowerCase().includes('ii')) {
                return 'II';
            }
            
            return null;
        };
        
        // Get initial role
        setRole(getRole());
        
        // Update role when token changes
        const updateRole = () => {
            setRole(getRole());
        };
        
        // Listen for token updates
        keycloak.onTokenExpired = updateRole;
        keycloak.onAuthSuccess = updateRole;
        
        return () => {
            keycloak.onTokenExpired = null;
            keycloak.onAuthSuccess = null;
        };
    }, []);
    
    return role;
}

