const config = window.APP_CONFIG || {
    backendUrl: 'https://tangy.local:5000',
    keycloak: 'https://tangy.auth.local:8443',
    realm: 'xbi-tasking',
    clientId: 'xbi-tasking-frontend',
    rolesClientId: 'xbi-tasking-backend'
};

export default config;