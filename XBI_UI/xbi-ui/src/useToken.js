import { useState, useEffect } from 'react';
import keycloak from './keycloak';

export default function useToken() {
    
    const getToken = () => { 
        // Keycloak JS adapter stores tokens in memory (most secure)
        // Check if Keycloak has an authenticated token
        if (keycloak.authenticated && keycloak.token) {
            return keycloak.token;
        }
        
        // Fallback: Try to get token from localStorage (for persistence across sessions)
        // This is optional - Keycloak handles token storage internally
        const storedToken = localStorage.getItem('keycloak_token');
        if (storedToken) {
            try {
                return JSON.parse(storedToken);
            } catch (e) {
                // If parsing fails, clear invalid token
                localStorage.removeItem('keycloak_token');
            }
        }
        
        // Fallback: Try sessionStorage (for backward compatibility)
        const tokenName = sessionStorage.getItem('token');
        if (tokenName) {
            try {
                return JSON.parse(tokenName);
            } catch (e) {
                sessionStorage.removeItem('token');
            }
        }
        
        return null;
    }
    
    const [token, setToken] = useState(getToken()); // call getToken() that tries to get the token and username and store it in token

    const saveToken = userToken => {
        // userToken is an array: [token, username]
        const token = userToken[0];
        const username = userToken[1];
        
        // Store username in localStorage for persistence
        if (username) {
            localStorage.setItem('username', JSON.stringify(username));
            sessionStorage.setItem('username', JSON.stringify(username)); // Also in sessionStorage for backward compatibility
        }
        
        // Store token in localStorage for persistence across browser sessions
        // Note: Keycloak JS adapter also stores it in memory automatically
        localStorage.setItem('keycloak_token', JSON.stringify(token));
        
        // Also store in sessionStorage for backward compatibility
        sessionStorage.setItem('token', JSON.stringify(token));
        
        setToken(token); // set the token to trigger a re-render, allowing App.js to check if there is indeed a token
    } 

    // Set up token refresh interval for Keycloak
    useEffect(() => {
        if (keycloak.authenticated) {
            // Refresh token before it expires (refresh 30 seconds before expiry)
            const refreshInterval = setInterval(() => {
                keycloak.updateToken(30)
                    .then((refreshed) => {
                        if (refreshed) {
                            console.log('Token refreshed');
                            // Update stored token in localStorage
                            const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
                            saveToken([keycloak.token, username]);
                        }
                    })
                    .catch((error) => {
                        console.error('Failed to refresh token:', error);
                        // Token refresh failed, clear stored tokens and logout
                        localStorage.removeItem('keycloak_token');
                        localStorage.removeItem('username');
                        sessionStorage.removeItem('token');
                        sessionStorage.removeItem('username');
                        keycloak.logout();
                    });
            }, 60000); // Check every minute

            return () => clearInterval(refreshInterval);
        }
    }, [keycloak.authenticated]);

    return { 
        setToken: saveToken, // ensure that we return this "saveToken" function back to the App.js and then into Login.js as "setToken"
        token // token value
    }
}
