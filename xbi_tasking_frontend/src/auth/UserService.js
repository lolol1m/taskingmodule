import Keycloak from "keycloak-js";
import config from "../config";

const _kc = new Keycloak({
  url: config.keycloak,
  realm: config.realm,
  clientId: config.clientId
});

/**
 * Initializes Keycloak instance and calls the provided callback function if successfully authenticated.
 *
 * @param onAuthenticatedCallback
 */


export async function initKeycloak() {
  try {
    const authenticated = await _kc.init({ onLoad: 'login-required', pkceMethod:"S256"});
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

const hasRole = (roles) => roles.some((role) => _kc.hasRealmRole(role));

const readUserRoleSingle= () => {
    try {
   
//note for realm 
    if (UserService.hasRole(["IA"])) return 'IA'
    if (UserService.hasRole(['Senior II'])) return 'Senior II'
    if (UserService.hasRole(['II'])) return 'II'
    return roles[0] || null
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