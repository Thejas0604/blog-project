import axios from "axios";

const base_URL = "http://localhost:3000/api/v1/posts/create";

export const createPost = async (postData) => {
    console.log(postData);
  const response = await axios.post(base_URL, {
    postData,
  });
  return response.data;
};
