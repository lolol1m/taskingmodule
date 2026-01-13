import { useState, useEffect } from 'react';
import keycloak, { keycloakConfigForDebug as keycloakConfig } from './keycloak';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

/**
 * AuthGuard component that ensures user is authenticated before rendering children
 * Redirects to Keycloak login if not authenticated
 */
export default function AuthGuard({ children, onAuthSuccess }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIA, setIsIA] = useState(false);

  useEffect(() => {
    // Store first token before checking admin status
    const checkAuth = async () => {
      try {
        // Initialize Keycloak with login-required (forces redirect if not authenticated)
        // Use initOnce to prevent multiple initializations
        const authenticated = await keycloak.initOnce({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256', // Re-enable - Keycloak 26.4.7 may require this
          enableLogging: true
        });
        
        setIsInitialized(true);
        
        if (authenticated) {
          // Store token
          const token = keycloak.token;
          localStorage.setItem('keycloak_token', token);
          
          // Check user roles
          const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
          const resourceRoles = keycloak.tokenParsed?.resource_access?.[keycloak.clientId]?.roles || [];
          const allRoles = [...realmRoles, ...resourceRoles];
          const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || '';
          
          const hasAdminRole = allRoles.includes('admin') || allRoles.includes('Admin') || allRoles.includes('ADMIN');
          const hasIARole = allRoles.includes('IA') || allRoles.includes('ia') || username.toLowerCase().includes('iauser');
          
          setIsAdmin(hasAdminRole);
          setIsIA(hasIARole);
          setIsAuthenticated(true);
          
          if (onAuthSuccess) {
            onAuthSuccess([token, username]);
          }
        } else {
          // Not authenticated - Keycloak will redirect to login
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        console.error('Error details:', {
          message: error.message,
          url: keycloakConfig.url,
          realm: keycloakConfig.realm,
          clientId: keycloakConfig.clientId,
          errorType: error.constructor.name
        });
        
        // Try to get more details from the error
        if (error.xhr) {
          console.error('HTTP Response:', {
            status: error.xhr.status,
            statusText: error.xhr.statusText,
            responseText: error.xhr.responseText
          });
        }
        
        
        // Check if it's a 401 error - this means client configuration is wrong
        if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
          console.error('401 Unauthorized Error during token exchange:');
        }
        
        setIsInitialized(true);
        setIsAuthenticated(false);
      }
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

