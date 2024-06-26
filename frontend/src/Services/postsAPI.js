import axios from "axios";

const base_URL = "http://localhost:3000/api/v1/posts";

//create post
export const createPost = async (postData) => {
    //console.log(postData);
  const response = await axios.post(`${base_URL}/create`, {
    title: postData.title,
    content: postData.description,
  });
  return response.data;
};

//get all posts
export const getAllPosts = async () => {
  const response = await axios.get(base_URL);
  return response.data;
}

// //get post by id
// export const getPostById = async (postId) => {
//   const response = await axios.get(`${base_URL}/${postId}`);
//   return response.data;
// }