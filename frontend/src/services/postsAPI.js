import axiosInstance from "../utils/axiosInstance";

//create post (admin only)
export const createPost = async (postData) => {
    const response = await axiosInstance.post("/posts/create", {
        title: postData.title,
        content: postData.content,
        category: postData.category,
    });
    return response.data;
};

//get all posts
export const getAllPosts = async (categoryId) => {
    const response = await axiosInstance.get("/posts", {
        params: categoryId ? { category: categoryId } : undefined,
    });
    return response.data;
};

//get post by id
export const getPostById = async (postId) => {
    const response = await axiosInstance.get(`/posts/${postId}`);
    return response.data;
};

//delete post (admin only)
export const deletePost = async (postId) => {
    const response = await axiosInstance.delete(`/posts/${postId}`);
    return response.data;
};

//update post (admin only)
export const updatePost = async (postData) => {
    const response = await axiosInstance.put(`/posts/${postData.postId}`, {
        title: postData.title,
        content: postData.content,
        category: postData.category,
    });
    return response.data;
};
