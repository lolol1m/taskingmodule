const axios = require("axios")
class API {
    constructor(api_link = import.meta.env.VITE_BACKEND_URL) {
        this.client =  axios.create({
            baseUrl: api_link,
            timeout: 1000,
        })
        //TODO: Integrate with keycloak js
          this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem("token"); 
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }


    getTasks() {

    }

    getUsers() {
        
    }

    
    


    
}