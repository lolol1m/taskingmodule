import axios from 'axios'

/*
There is no need to stringy the body as axios will do it automatically 
*/
class API {
    constructor(api_link = import.meta.env.VITE_BACKEND_URL) {
        this.client =  axios.create({
            baseURL: api_link,
            timeout: 1000,
        })
        //TODO: Integrate with keycloak js
          this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem("access_token"); 
                if (!token) {
                    window.location.href = `${api_link}/auth/login` //redirect to login
                    this.__redirectToLogin()
                    throw new Error('Not authenticated')
                }
                config.headers.Authorization = `Bearer ${token}`


                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
        this.client.interceptors.response.use(
            (response) => {
                console.log(`Response successful! ${response.status}`)
                return response
            },
        async (error) => {
    const originalRequest = error.config;

   
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // prevent infinite loops

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        this.__redirectToLogin();
        return Promise.reject(new Error("Refresh token missing"));
      }

      try {
        
        const refreshResponse = await axios.post(
          `${api_link}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const refreshedToken = refreshResponse.data?.access_token;
        if (!refreshedToken) {
          this.__redirectToLogin();
          return Promise.reject(new Error("Refresh failed"));
        }

    
        localStorage.setItem("access_token", refreshedToken);

        
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return this.client(originalRequest);
      } catch (refreshError) {
        this.__redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    
    return Promise.reject(error);
  }
        )

    }

    __redirectToLogin() { //Private method to redirect to login
        window.location.href = `${api_link}/auth/login`

    }


    async getUsers() {
        const response = await this.client.get("/getUsers")
        return response.data
    }

    async getAreas() {
        const response = await this.client.get("/getAreas")
        return response.data
    }

    async postTaskingManagerData(body) {
        const response =await  this.client.post("/getTaskingManagerData",  body)
        return response.data
    }

    async postDeleteImage(body){
        const response = await this.client.post("/deleteImage", body)
        return response.data

    }

    async postAssignTask(body){ 
              const response = await this.client.post("/assignTask",  body)
        return response.data
    }

    async postUpdateTaskingManagerData(body){ 
        const response = await this.client.post("/updateTaskingManagerData",  body)
    
        return response.data
    }
        async postInsertTTGData(body){ 
        const response = await this.client.post("/insertTTGData", body)
        return response.data
    }





    
}
 export default API


