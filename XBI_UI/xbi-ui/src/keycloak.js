import Keycloak from 'keycloak-js';

// Keycloak configuration - VERIFY THESE MATCH YOUR KEYCLOAK SETUP
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'xbi-tasking',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'xbi-tasking-frontend',
};

// Log configuration for debugging
console.log('🔧 Keycloak Config:', keycloakConfig);
console.log('🔧 Current URL:', window.location.href);
console.log('🔧 Origin:', window.location.origin);
console.log('🔧 Pathname:', window.location.pathname);

// Initialize Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

// Track initialization state to prevent multiple initializations
let initPromise = null;
let isInitialized = false;

// Wrapper function to ensure Keycloak is only initialized once
keycloak.initOnce = async (options) => {
  if (isInitialized) {
    return keycloak.authenticated;
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  // Start initialization
  initPromise = keycloak.init(options)
    .then((authenticated) => {
      isInitialized = true;
      console.log('Keycloak initialized successfully');
      return authenticated;
    })
    .catch((error) => {
      console.error('Keycloak initialization error:', error);
      initPromise = null;
      isInitialized = false;
      throw error;
    });
  
  return initPromise;
};

export default keycloak;
export const keycloakConfigForDebug = keycloakConfig;
