import axios from "axios";
import axiosInstance from "../utils/axiosInstance";

const base_URL = "http://localhost:3000/api/v1/posts";

//create post
export const createPost = async (formData) => {
    const response = await axiosInstance.post(`${base_URL}/create`, formData, {
        withCredentials: true,
    });
    return response.data;
};

//get all posts
export const getAllPosts = async () => {
    const response = await axiosInstance.get(base_URL);
    return response.data;
};

//get post by id
export const getPostById = async (postId) => {
    const response = await axios.get(`${base_URL}/${postId}`);
    return response.data;
};

//delete post
export const deletePost = async (postId) => {
    const response = await axiosInstance.delete(`${base_URL}/${postId}`, {
        withCredentials: true,
    });
    return response.data;
};

//update post
export const updatePost = async (postData) => {
    const response = await axiosInstance.put(
        `${base_URL}/${postData?.postId}`,
        {
            title: postData.title,
            content: postData.description,
        },
        { withCredentials: true }
    );
    return response.data;
};

//like post
export const likePost = async (postId) => {
    const response = await axiosInstance.put(
        `${base_URL}/${postId}/like`,
        {},
        {
            withCredentials: true,
        }
    );
    return response.data;
};
