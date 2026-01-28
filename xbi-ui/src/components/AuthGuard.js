import { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { jwtDecode } from 'jwt-decode';

const theme = createTheme();

// Get backend API URL (should match App.js)
const BACKEND_URL = process.env.REACT_APP_DB_API_URL || 'http://localhost:5000';

/**
 * AuthGuard component that ensures user is authenticated before rendering children
 * Redirects to backend login endpoint (which redirects to Keycloak) if not authenticated
 */

export default function AuthGuard({ children, onAuthSuccess }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIA, setIsIA] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const applyToken = (token, refreshToken, idToken, fallbackUsername) => {
        try {
          const decoded = jwtDecode(token);
          const realmRoles = decoded.realm_access?.roles || [];
          const clientId = decoded.azp || decoded.aud;
          const resourceRoles = decoded.resource_access?.[clientId]?.roles || [];
          const allRoles = [...realmRoles, ...resourceRoles];
          const tokenUsername = decoded.preferred_username || decoded.sub || fallbackUsername || 'user';

          const hasAdminRole = allRoles.includes('admin') || allRoles.includes('Admin') || allRoles.includes('ADMIN');
          const hasIARole = allRoles.includes('IA') || allRoles.includes('ia') || tokenUsername.toLowerCase().includes('iauser');

          setIsAdmin(hasAdminRole);
          setIsIA(hasIARole);
          setIsAuthenticated(true);
          setIsInitialized(true);

          localStorage.setItem('access_token', token);
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
          if (idToken) {
            localStorage.setItem('id_token', idToken);
          }
          localStorage.setItem('user', JSON.stringify({
            username: tokenUsername,
            roles: allRoles,
            isAdmin: hasAdminRole,
            isIA: hasIARole
          }));

          if (onAuthSuccess) {
            onAuthSuccess([token, tokenUsername]);
          }
          return true;
        } catch (error) {
          console.error('Error decoding token:', error);
          return false;
        }
      };

      const refreshTokens = async () => {
        const storedRefresh = localStorage.getItem('refresh_token');
        if (!storedRefresh) {
          return false;
        }
        try {
          const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: storedRefresh })
          });
          if (!response.ok) {
            return false;
          }
          const data = await response.json();
          return applyToken(
            data.access_token,
            data.refresh_token || storedRefresh,
            data.id_token,
            null
          );
        } catch (error) {
          console.error('Error refreshing token:', error);
          return false;
        }
      };

      // Check for error in URL query params (from backend redirect on error)
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      if (error) {
        console.error('Authentication error:', error);
        alert(`Authentication failed: ${error}. Please check the backend console for details.`);
        // Clear any stale tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('user');
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
        // Don't redirect again - just show error
        setIsInitialized(true);
        setIsAuthenticated(false);
        return;
      }
      
      // Check if we have tokens in URL fragment (after redirect from backend)
      const hash = window.location.hash.substring(1); // Remove '#'
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const idToken = params.get('id_token');
      const username = params.get('username');
      
      if (accessToken) {
        // We have tokens from redirect - store them
        if (applyToken(accessToken, refreshToken, idToken, username)) {
          // Clean up URL fragment
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
      
      // Check if we have stored token
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          const now = Math.floor(Date.now() / 1000);
          
          // Check if token is expired
          if (decoded.exp && decoded.exp < now) {
            // Token expired - try refresh
            refreshTokens().then((refreshed) => {
              if (!refreshed) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('id_token');
                localStorage.removeItem('user');
                window.location.href = `${BACKEND_URL}/auth/login`;
              }
            });
            return;
          }
          applyToken(storedToken, localStorage.getItem('refresh_token'), localStorage.getItem('id_token'));
          return;
        } catch (error) {
          console.error('Error validating stored token:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('id_token');
          localStorage.removeItem('user');
        }
      }
      
      // No valid token - redirect to backend login
      setIsInitialized(true);
      setIsAuthenticated(false);
      window.location.href = `${BACKEND_URL}/auth/login`;
    };
    
    checkAuth();
  }, [onAuthSuccess]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <CircularProgress />
            <Typography component="h2" variant="h6" sx={{ mt: 2 }}>
              Authenticating...
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  // Not authenticated - Keycloak should have redirected, but show loading just in case
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <CircularProgress />
            <Typography component="h2" variant="h6" sx={{ mt: 2 }}>
              Redirecting to login...
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}

