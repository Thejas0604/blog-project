import axiosInstance from "../utils/axiosInstance";

const base_URL = "http://localhost:3000/api/v1/category";

//create category (admin only)
export const createCategory = async (categoryData) => {
    const response = await axiosInstance.post(
        `${base_URL}/create`,
        {
            categoryName: categoryData.categoryName,
            categoryDescription: categoryData.categoryDescription,
        },
        {
            withCredentials: true,
        }
    );
    return response.data;
};

//get all categories
export const getAllCategories = async () => {
    const response = await axiosInstance.get(base_URL);
    return response.data;
};

//get category by id
export const getCategoryById = async (categoryId) => {
    const response = await axiosInstance.get(`${base_URL}/${categoryId}`);
    return response.data;
};

//update category (admin only)
export const updateCategory = async (categoryId, categoryData) => {
    const response = await axiosInstance.put(
        `${base_URL}/${categoryId}`,
        {
            categoryName: categoryData.categoryName,
            categoryDescription: categoryData.categoryDescription,
        },
        {
            withCredentials: true,
        }
    );
    return response.data;
};

//delete category (admin only)
export const deleteCategory = async (categoryId) => {
    const response = await axiosInstance.delete(`${base_URL}/${categoryId}`, {
        withCredentials: true,
    });
    return response.data;
};
