import Keycloak from "keycloak-js";

const _kc = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_CLIENT_ID
});

/**
 * Initializes Keycloak instance and calls the provided callback function if successfully authenticated.
 *
 * @param onAuthenticatedCallback
 */


export async function initKeycloak() {
  try {
    const authenticated = await _kc.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
    console.log(_kc, "Keycloak config loaded")
    if (authenticated) {
        console.log('User is authenticated');
    } else {
        console.log('User is not authenticated');
    }
  
  } catch(error) {
     console.error('Failed to initialize adapter:', error);
  }
 
  
  
}

const doLogin = _kc.login;

const doLogout = _kc.logout;

const getToken = () => _kc.token;

const getTokenParsed = () => _kc.tokenParsed;

const isLoggedIn = () => !!_kc.token;

const updateToken = (successCallback) =>
  _kc.updateToken(5)
    .then(successCallback)
    .catch(doLogin);

const getUsername = () => _kc.tokenParsed?.preferred_username;

const _clientId = import.meta.env.VITE_CLIENT_ID

const hasRole = (roles) => roles.some((role) => _kc.hasResourceRole(role, _clientId));

const readUserRoleSingle = () => {
  try {
    if (UserService.hasRole(['IA'])) return 'IA'
    if (UserService.hasRole(['Senior II'])) return 'Senior II'
    if (UserService.hasRole(['II'])) return 'II'
    return null
  } catch (error) {
    console.warn('Unable to read user role', error)
    return null
  }
}

const UserService = {
  initKeycloak,
  doLogin,
  doLogout,
  isLoggedIn,
  getToken,
  getTokenParsed,
  updateToken,
  getUsername,
  hasRole,
  readUserRoleSingle
};

export default UserService;