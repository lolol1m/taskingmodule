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
                    this.#__redirectToLogin()
                    this.#__clearAuthTokens();
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
        this.#__redirectToLogin();
        this.#__clearAuthTokens();
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
          this.#__redirectToLogin();
        this.#__clearAuthTokens();
          return Promise.reject(new Error("Refresh failed"));
        }


         if (refreshResponse.data?.access_token) {
    localStorage.setItem('access_token', refreshResponse.data?.access_token)
  }
  if (refreshResponse.data?.refresh_token) {
    localStorage.setItem('refresh_token', refreshResponse.data?.refresh_token)
  }
  if (refreshResponse.data?.id_token) {
    localStorage.setItem('id_token', refreshResponse.data?.id_token)
  }

    
        

        
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return this.client(originalRequest);
      } catch (refreshError) {
        this.#__clearAuthTokens();
        this.#__redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    
    return Promise.reject(error);
  }
        )

    }

    #__redirectToLogin() { //Private method to redirect to login
        window.location.href = `${api_link}/auth/login`

    }
    #__clearAuthTokens() {
          localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('id_token')
  localStorage.removeItem('user')
  localStorage.removeItem('username')
    }

    async getUsers() {
        const response = await this.client.get("/getUsers")
        return response.data
    }

    async getAreas() {
        const response = await this.client.get("/getAreas")
        return response.data
    }

    async getCompleteImageData(body) {
        const response = await this.client.post("/getCompleteImageData", body)
        return response.data
    }

    async uncompleteImages(body) {
        const response = await this.client.post("/uncompleteImages", body)
        return response.data
    }

    async setOpsvAreas(body) {
        const response = await this.client.post("/setOpsvAreas", body)
        return response.data
    }

    async postTaskingManagerData(body) {
        const response =await  this.client.post("/getTaskingManagerData",  body)
        return response.data
    }

        async postTaskingSummaryData(body) {
        const response =await  this.client.post("/getTaskingSummaryData",  body)
        return response.data
    }

    async postUpdateTaskingSummaryData(body) {
        const response = await this.client.post("/updateTaskingSummaryData", body)
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


    async postGetCompleteImageData(body){
        const response =  await this.client.post("/getCompleteImageData", body)
        return response.data
    }

    async postUncompleteImages(body) {
        const response =  await this.client.post("/uncompleteImages", body)
        return response.data
    }




    
}
 export default API


