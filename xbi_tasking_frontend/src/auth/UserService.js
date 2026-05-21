import Keycloak from "keycloak-js";
import config from '../config'

const _kc = new Keycloak({
  // url: import.meta.env.VITE_KEYCLOAK_URL,
  // realm: import.meta.env.VITE_KEYCLOAK_REALM,
  // clientId: import.meta.env.VITE_CLIENT_ID
  url: config.keycloak.url,
  realm: config.keycloak.realm,
  clientId: config.keycloak.clientId
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

// const _clientId = import.meta.env.VITE_CLIENT_ID
const _clientId = config.keycloak.clientId
// Client where the II / Senior II / IA client roles are defined.
// Falls back to the frontend client if not set.
// const _rolesClientId = import.meta.env.VITE_ROLES_CLIENT_ID || _clientId
const _rolesClientId = config.keycloak.rolesClientId || _clientId

const _hasAnyRole = (role) => {
  if (_kc.hasResourceRole(role, _rolesClientId)) return true
  if (_rolesClientId !== _clientId && _kc.hasResourceRole(role, _clientId)) return true
  if (_kc.hasRealmRole(role)) return true
  return false
}

const hasRole = (roles) => roles.some(_hasAnyRole);

const readUserRoleSingle = () => {
  try {
    let resolved = null
    if (_hasAnyRole('IA')) resolved = 'IA'
    else if (_hasAnyRole('Senior II')) resolved = 'Senior II'
    else if (_hasAnyRole('II')) resolved = 'II'

    if (import.meta.env.DEV) {
      console.log(
        '[UserService] readUserRoleSingle -> %o (user=%s) rolesClient=%s resource_access=%o realm_access=%o',
        resolved,
        _kc.tokenParsed?.preferred_username,
        _rolesClientId,
        _kc.tokenParsed?.resource_access,
        _kc.tokenParsed?.realm_access,
      )
    }
    return resolved
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