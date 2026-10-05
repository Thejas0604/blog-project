import axiosInstance from "../utils/axiosInstance";

export const loginAPI = async (userData) => {
    const response = await axiosInstance.post("/user/login", {
        username: userData?.username,
        password: userData?.password,
    });
    return response;
};

export const logoutAPI = async () => {
    const response = await axiosInstance.post("/user/logout");
    return response.data;
};

export const getProfileAPI = async () => {
    const response = await axiosInstance.get("/user/profile");
    return response.data;
};
