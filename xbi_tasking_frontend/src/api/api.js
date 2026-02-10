import axios from 'axios'
import UserService from '../auth/UserService';
/*
There is no need to stringy the body as axios will do it automatically 
*/
class API {
    constructor(api_link = import.meta.env.VITE_BACKEND_URL) {
        this.client =  axios.create({
            baseURL: api_link,
            timeout: 5000,
        })
        //TODO: Integrate with keycloak js
          this.client.interceptors.request.use(
            async (config) => {
                try {
                    await UserService.updateToken()
                } catch (err) {
                    console.warn('Token refresh failed', err)
                }

                const token = UserService.getToken()
                if (!token) {
                    UserService.doLogin()
                    throw new Error('Not authenticated')
                }
                config.headers.Authorization = `Bearer ${token}`
                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        );
        this.client.interceptors.response.use(
            (response) => {
                console.log(`Response successful! ${response.statusText}`)
                return response
            },
        async (error) => {
    const originalRequest = error.config;
    console.log("There is an error:", error)
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true
      try {
        await UserService.updateToken(() => {
          const refreshedToken = UserService.getToken()
          if (refreshedToken) {
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
          }
        })
        return this.client(originalRequest)
      } catch (refreshError) {
        UserService.doLogin()
        return Promise.reject(refreshError)
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
        const response = await this.client.get("/users/getUsers")
        return response.data
    }

    async createUser(body) {
        const response = await this.client.post("/users/createUser", body)
        return response.data
    }

    async getAreas() {
        const response = await this.client.get("/lookup/getAreas")
        return response.data
    }

    async getCompleteImageData(body) {
        const response = await this.client.post("/tasking/getCompleteImageData", body)
        return response.data
    }

    async uncompleteImages(body) {
        const response = await this.client.post("/tasking/uncompleteImages", body)
        return response.data
    }

    async setOpsvAreas(body) {
        const response = await this.client.post("/lookup/setOpsvAreas", body)
        return response.data
    }

    async postTaskingManagerData(body) {
        const response =await  this.client.post("/tasking/getTaskingManagerData",  body)
        return response.data
    }

        async postTaskingSummaryData(body) {
        const response =await  this.client.post("/tasking/getTaskingSummaryData",  body)
        return response.data
    }

    async postUpdateTaskingSummaryData(body) {
        const response = await this.client.post("/tasking/updateTaskingSummaryData", body)
        return response.data
    }

    async postDeleteImage(body){
        const response = await this.client.post("/images/deleteImage", body)
        return response.data

    }

    async postAssignTask(body){ 
              const response = await this.client.post("/tasking/assignTask",  body)
        return response.data
    }

    async postUpdateTaskingManagerData(body){ 
        const response = await this.client.post("/tasking/updateTaskingManagerData",  body)
    
        return response.data
    }
        async postInsertTTGData(body){ 
        const response = await this.client.post("/images/insertTTGData", body)
        return response.data
    }

    async insertDSTAData(formData, autoAssign = true) {
        const response = await this.client.post("/images/insertDSTAData", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            params: { auto_assign: autoAssign },
        })
        return response.data
    }


    async postGetCompleteImageData(body){
        const response =  await this.client.post("/tasking/getCompleteImageData", body)
        return response.data
    }

    async postUncompleteImages(body) {
        const response =  await this.client.post("/tasking/uncompleteImages", body)
        return response.data
    }

    async getXbiReportData(body) {
        const response = await this.client.post("/reports/getXBIReportData", body)
        return response.data
    }

    async getXbiReportDataForExcel(body) {
        return this.client.post("/reports/getXBIReportDataForExcel", body, { responseType: 'blob' })
    }

    async getSensorCategory() {
        const response = await this.client.get("/lookup/getSensorCategory")
        return response.data
    }

    async updateSensorCategory(body) {
        const response = await this.client.post("/lookup/updateSensorCategory", body)
        return response.data
    }

    async changePassword(currentPassword, newPassword) {
        const response = await this.client.post("/users/changePassword", {
            currentPassword,
            newPassword,
        })
        return response.data
    }

    async adminResetPassword(targetUsername, newPassword) {
        const response = await this.client.post("/users/adminResetPassword", {
            targetUsername,
            newPassword,
        })
        return response.data
    }
}
 export default API


