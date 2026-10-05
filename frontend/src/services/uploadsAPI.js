import axiosInstance from "../utils/axiosInstance";

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Upload an image (admin only). Returns { status, message, url, name }.
export const uploadImage = async (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error("Only PNG, JPEG, GIF and WebP images are allowed");
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Image too large (max 5 MB)");
    }
    const response = await axiosInstance.post("/uploads", file, {
        headers: { "Content-Type": file.type },
        transformRequest: [(data) => data],
    });
    return response.data;
};
