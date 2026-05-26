const config = window.APP_CONFIG || {
    backendUrl: 'http://localhost:5000',
    keycloak: 'http://localhost:8080',
    realm: 'xbi-tasking',
    clientId: 'xbi-tasking-frontend',
    rolesClientId: 'xbi-tasking-backend'
};

export default config;