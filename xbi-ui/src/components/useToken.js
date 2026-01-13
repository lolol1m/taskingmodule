import { useState, useEffect } from 'react';

export default function useToken() {
    
    const getToken = () => { 
        // Get access token from localStorage
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            return accessToken;
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
        
        // Store token in localStorage
        localStorage.setItem('access_token', token);
        
        // Also store in sessionStorage for backward compatibility
        sessionStorage.setItem('token', JSON.stringify(token));
        
        setToken(token); // set the token to trigger a re-render, allowing App.js to check if there is indeed a token
    } 

    return { 
        setToken: saveToken, // ensure that we return this "saveToken" function back to the App.js and then into Login.js as "setToken"
        token // token value
    }
}
