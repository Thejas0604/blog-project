import axios from "axios";
const base_URL = "http://localhost:3000/api/v1/user";

export const registerAPI = async (userData) => {
  const response = await axios.post(
    `${base_URL}/register`,
    {
      username: userData?.username,
      email: userData?.email,
      password: userData?.password,
    },
    { withCredentials: true }
  );
  return response.data;
};

export const loginAPI = async (userData) => {
  const response = await axios.post(
    `${base_URL}/login`,
    {
      username: userData?.username,
      password: userData?.password,
    },
    { withCredentials: true }
  );
  return response.data;
};

export const checkAuthStatus = async (userData) => {
  const response = await axios.get(`${base_URL}/checkAuthenticated`, {
    withCredentials: true,
  });
  return response.data;
};
