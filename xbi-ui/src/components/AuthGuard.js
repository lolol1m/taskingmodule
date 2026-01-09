import { useState, useEffect } from 'react';
import keycloak, { keycloakConfigForDebug as keycloakConfig } from './keycloak';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

// Hardcoded second authentication password
const SECOND_AUTH_PASSWORD = 'admin345';

/**
 * AuthGuard component that ensures user is authenticated before rendering children
 * Redirects to Keycloak login if not authenticated
 */
export default function AuthGuard({ children, onAuthSuccess }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIA, setIsIA] = useState(false);
  const [needsSecondAuth, setNeedsSecondAuth] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [secondAuthPassword, setSecondAuthPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
          
          // Check if user has IA role (IA users require double authentication)
          // Check both realm roles and resource roles, plus username fallback
          const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
          const resourceRoles = keycloak.tokenParsed?.resource_access?.[keycloak.clientId]?.roles || [];
          const allRoles = [...realmRoles, ...resourceRoles];
          const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || '';
          
          
          
          const hasAdminRole = allRoles.includes('admin') || allRoles.includes('Admin') || allRoles.includes('ADMIN');
          // Check for IA role in roles or username
          const hasIARole = allRoles.includes('IA') || allRoles.includes('ia') || username.toLowerCase().includes('iauser');
          
          console.log('IA Role Check:', { hasIARole, username: username.toLowerCase() });
          
          if (hasIARole) {
            // IA user - check if password authentication is needed
            const storedFirstToken = localStorage.getItem('first_auth_token');
            const passwordValidated = localStorage.getItem('ia_password_validated');
            
            // Check if password was already validated for this token
            if (passwordValidated === firstToken) {
              // Password already validated for this token - grant access
              setIsAdmin(hasAdminRole);
              setIsIA(hasIARole);
              setIsAuthenticated(true);
              setAdminToken(firstToken);
              if (onAuthSuccess) {
                const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
                onAuthSuccess([firstToken, username, firstToken]);
              }
            } else if (storedFirstToken === firstToken && passwordValidated) {
              // Token matches stored token and password was validated - grant access
              setIsAdmin(hasAdminRole);
              setIsIA(hasIARole);
              setIsAuthenticated(true);
              setAdminToken(firstToken);
              if (onAuthSuccess) {
                const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
                onAuthSuccess([firstToken, username, firstToken]);
              }
            } else {
              // IA needs password authentication - store first token
              localStorage.setItem('first_auth_token', firstToken);
              setIsAdmin(hasAdminRole);
              setIsIA(hasIARole);
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

  // Handle second authentication password submission
  const handleSecondAuthPassword = () => {
    // Clear any previous error
    setPasswordError('');
    
    // Validate the hardcoded password
    if (secondAuthPassword === SECOND_AUTH_PASSWORD) {
      // Password is correct - mark as validated and grant access
      const firstToken = localStorage.getItem('first_auth_token') || keycloak.token;
      localStorage.setItem('ia_password_validated', firstToken);
      localStorage.setItem('admin_token', firstToken);
      
      // Grant access
      setIsAuthenticated(true);
      setAdminToken(firstToken);
      setNeedsSecondAuth(false);
      
      if (onAuthSuccess) {
        const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.sub || 'user';
        onAuthSuccess([firstToken, username, firstToken]);
      }
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setSecondAuthPassword(''); 
    }
  };

  // Handle Enter key press in password field
  const handlePasswordKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSecondAuthPassword();
    }
  };

  // Note: Second auth detection is now handled in the main checkAuth function
  // This useEffect is kept for backward compatibility but the main logic is in checkAuth

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

  // Show second authentication prompt for admins/IA
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
              width: '100%',
            }}
          >
            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
              IA Authentication Required
            </Typography>
            <Typography component="h2" variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              IA accounts require a second authentication step for enhanced security. Please enter the second authentication password.
            </Typography>
            
            {passwordError && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {passwordError}
              </Alert>
            )}
            
            <TextField
              type="password"
              label="Second Authentication Password"
              variant="outlined"
              fullWidth
              value={secondAuthPassword}
              onChange={(e) => {
                setSecondAuthPassword(e.target.value);
                setPasswordError(''); // Clear error when user types
              }}
              onKeyPress={handlePasswordKeyPress}
              sx={{ mb: 2 }}
              autoFocus
            />
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleSecondAuthPassword}
              sx={{ mt: 1 }}
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

