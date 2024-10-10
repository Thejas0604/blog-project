import axios from "axios";

const base_URL = "http://localhost:3000/api/v1";

// Bearer token for configuring the headers
const axiosInstance = axios.create({
    baseURL: base_URL,
    withCredentials: true,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); 
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; 
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;