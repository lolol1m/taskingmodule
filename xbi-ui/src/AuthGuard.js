import { useState, useEffect } from 'react';
import keycloak, { keycloakConfigForDebug as keycloakConfig } from './keycloak';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
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
  const [needsSecondAuth, setNeedsSecondAuth] = useState(false);
  const [adminToken, setAdminToken] = useState(null);

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
          // Store first token
          const firstToken = keycloak.token;
          localStorage.setItem('keycloak_token', firstToken);
          
          // Check if user has admin role
          const roles = keycloak.tokenParsed?.realm_access?.roles || [];
          const hasAdminRole = roles.includes('admin') || roles.includes('Admin') || roles.includes('ADMIN');
          
          if (hasAdminRole) {
            // Admin user - check if second authentication is needed
            const storedAdminToken = localStorage.getItem('admin_token');
            const storedFirstToken = localStorage.getItem('first_auth_token');
            
            if (storedAdminToken && storedFirstToken === firstToken) {
              // Second auth already done and first token matches
              setIsAdmin(true);
              setIsAuthenticated(true);
              setAdminToken(storedAdminToken);
              if (onAuthSuccess) {
                const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
                onAuthSuccess([firstToken, username, storedAdminToken]);
              }
            } else {
              // Admin needs second authentication - store first token
              localStorage.setItem('first_auth_token', firstToken);
              setIsAdmin(true);
              setNeedsSecondAuth(true);
            }
          } else {
            // Regular user - authenticated
            setIsAuthenticated(true);
            if (onAuthSuccess) {
              const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
              onAuthSuccess([firstToken, username]);
            }
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

  // Handle second authentication for admins
  const handleSecondAuth = () => {
    // Redirect to Keycloak login again for second authentication
    keycloak.login({
      redirectUri: window.location.origin + window.location.pathname,
      prompt: 'login' // Force login prompt even if already authenticated
    });
  };

  // Check if we're returning from second auth
  useEffect(() => {
    if (isAdmin && needsSecondAuth && keycloak.authenticated) {
      const currentToken = keycloak.token;
      const firstToken = localStorage.getItem('first_auth_token');
      
      // If we have a first token and current token is different, this is second auth
      if (firstToken && currentToken !== firstToken) {
        // This is the second authentication - store it
        localStorage.setItem('admin_token', currentToken);
        setAdminToken(currentToken);
        setNeedsSecondAuth(false);
        setIsAuthenticated(true);
        if (onAuthSuccess) {
          const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
          onAuthSuccess([firstToken, username, currentToken]);
        }
      } else if (!firstToken) {
        // First auth not stored yet, store it
        localStorage.setItem('first_auth_token', currentToken);
        localStorage.setItem('keycloak_token', currentToken);
      }
    }
  }, [isAdmin, needsSecondAuth, onAuthSuccess, keycloak.authenticated]);

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

  // Show second authentication prompt for admins
  if (needsSecondAuth) {
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
            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
              Admin Authentication Required
            </Typography>
            <Typography component="h2" variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              Admin accounts require a second authentication step for enhanced security.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSecondAuth}
              sx={{ mt: 2 }}
            >
              Continue with Second Authentication
            </Button>
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

