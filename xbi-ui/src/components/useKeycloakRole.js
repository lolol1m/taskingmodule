/**
 * Hook to get the current user's role from stored user info
 * Returns: 'II', 'Senior II', 'IA', or null
 */
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export default function useKeycloakRole() {
    const [role, setRole] = useState(null);
    
    useEffect(() => {
        const getRole = () => {
            // Try to get user info from localStorage (set by AuthGuard)
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    const roles = user.roles || [];
                    
                    // Check for account type roles (II, Senior II, IA)
                    // Priority: IA > Senior II > II
                    if (roles.includes('IA')) {
                        return 'IA';
                    } else if (roles.includes('Senior II')) {
                        return 'Senior II';
                    } else if (roles.includes('II')) {
                        return 'II';
                    }
                } catch (e) {
                    console.error('Error parsing user info:', e);
                }
            }
            
            // Fallback: Decode token directly
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
                try {
                    const decoded = jwtDecode(accessToken);
                    const realmRoles = decoded.realm_access?.roles || [];
                    const resourceRoles = decoded.resource_access?.[decoded.aud]?.roles || [];
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
                    const username = decoded.preferred_username || decoded.sub || '';
                    if (username.toLowerCase().includes('ia')) {
                        return 'IA';
                    } else if (username.toLowerCase().includes('senior_ii') || username.toLowerCase().includes('senior ii')) {
                        return 'Senior II';
                    } else if (username.toLowerCase().includes('ii')) {
                        return 'II';
                    }
                } catch (e) {
                    console.error('Error decoding token:', e);
                }
            }
            
            return null;
        };
        
        // Get initial role
        setRole(getRole());
        
        // Listen for storage changes (when user logs in/out)
        const handleStorageChange = () => {
            setRole(getRole());
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        // Also check periodically (in case token is updated in same tab)
        const interval = setInterval(() => {
            setRole(getRole());
        }, 5000);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);
    
    return role;
}


