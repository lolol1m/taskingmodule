import { useState } from 'react';

export default function useToken() {
    
    const getToken = () => { 
        const tokenName = sessionStorage.getItem('token');
        const userToken = JSON.parse(tokenName);
        return userToken
      }
    const [token, setToken] = useState(getToken()); // call getToken() that tries to get the token and username and store it in token

    const saveToken = userToken => {

        sessionStorage.setItem('token', JSON.stringify(userToken[0]));
        sessionStorage.setItem('username', JSON.stringify(userToken[1]));
        setToken(userToken[0]); // set the token to the username and it will trigger a re-render, allowing App.js to check if there is indeed a token
      } 

    return { 
        setToken: saveToken, // ensure that we return this "saveToken" function back to the App.js and then into Login.js as "setToken"
        token // token value
      }

}