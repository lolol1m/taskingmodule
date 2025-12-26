import Keycloak from 'keycloak-js';

// Keycloak configuration
// Update these values to match your Keycloak server setup
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'xbi-tasking',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'xbi-tasking-frontend',
};

// Initialize Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

export default keycloak;

