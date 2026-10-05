import axios from "axios";

const axiosInstance = axios.create({
    baseURL: (import.meta.env.VITE_API_URL ?? "") + "/api/v1",
    withCredentials: true,
});

// AuthContext registers a callback so a 401 clears the logged-in state.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
    onUnauthorized = fn;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && onUnauthorized) {
            onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
