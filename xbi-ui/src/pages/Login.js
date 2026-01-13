import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';

// Login page - redirects to backend auth endpoint
const BACKEND_URL = process.env.REACT_APP_DB_API_URL || 'http://localhost:5000';



function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      {'SCVU '} 
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const theme = createTheme();


export default function Login({ toSetToken }) { // receives the setToken function (that is from useToken.js) from login page

  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user already has a token
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      setIsInitialized(true);
      setIsAuthenticated(true);
      // User is already authenticated
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          toSetToken([accessToken, user.username]);
        } catch (e) {
          console.error('Error parsing user info:', e);
        }
      }
    } else {
      setIsInitialized(true);
      setIsAuthenticated(false);
    }
  }, [toSetToken]);

  const handleLogin = () => {
    // Redirect to backend login endpoint (which redirects to Keycloak)
    window.location.href = `${BACKEND_URL}/auth/login`;
  };

  if (!isInitialized) {
    // Show loading spinner while Keycloak initializes
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
              Initializing authentication...
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

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
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Login Page
          </Typography>
          <Typography component="h2" variant="h5">
            XBI Tasking Module
          </Typography>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleLogin}
            >
              Sign In with Keycloak
            </Button>
          </Box>
        </Box>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </Container>
    </ThemeProvider>
  );
}
