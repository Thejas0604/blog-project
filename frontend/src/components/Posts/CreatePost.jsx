import React, { useState, useEffect, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { createPost } from "../../Services/postsAPI";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { FaTimesCircle } from "react-icons/fa";
import Select from "react-select";
import { useQuery } from "@tanstack/react-query";
import { getAllCategoriesAPI } from "../../Services/categoriesAPI";

const CreatePost = () => {
  const fileInputRef = useRef(null);
  //state for wysiwyg editor
  const [content, setContent] = useState("");

  //file upload state
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  //post mutation
  const postMutation = useMutation({
    mutationKey: ["create-post"],
    mutationFn: createPost,
  });
  const formik = useFormik({
    initialValues: {
      content: "",
      image: "",
      category: "",
    },
    validationSchema: Yup.object({
      content: Yup.string().required("Content is required"),
      image: Yup.string().required("Image is required"),
      category: Yup.string().required("Category is required"),
    }),
    onSubmit: (values) => {
      console.log(values);
      const formData = new FormData();
      formData.append("content", values.content);
      formData.append("image", values.image);
      formData.append("category", values.category);
      postMutation.mutate(formData);
    },
  });

  //!Category logic
  //getting categories
  const {
    data: categoriesData,
    err,
    refetch,
  } = useQuery({
    queryKey: ["fetch-categories"],
    queryFn: getAllCategoriesAPI,
  });
  //console.log(categoriesData.categories);

  const options = [];
  categoriesData?.categories?.map((category) => {
    options.push({
      value: category.categoryName,
      label: category.categoryName,
    });
  });

  //const MyComponent = () => <Select options={options} />;

  //!file upload logic
  //handle file change
  const handleFileChange = (event) => {
    //console.log(event);
    const file = event.currentTarget.files[0];
    //console.log(file);
    if (file?.size > 1048576) {
      setImageError("Image size should be less than 1mb");
      return;
    }
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setImageError("Invalid file type");
      return;
    }
    formik.setFieldValue("image", file);
    setImagePreview(URL.createObjectURL(file));
  };

  //remove image
  const removeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImagePreview(null);
    formik.setFieldValue("image", null);
  };
  //console.log(postMutation);
  const isLoading = postMutation.isPending;
  const isSuccess = postMutation.isSuccess;
  const isError = postMutation.isError;
  const error = postMutation.error;

  return (
    <div className="flex items-center justify-center bg-gray-200">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 m-4">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          Add New Post
        </h2>
        <form className="space-y-6" onSubmit={formik.handleSubmit}>
          <ReactQuill
            value={formik.values.content}
            theme="snow"
            onChange={(value) => {
              setContent(value);
              formik.setFieldValue("content", value);
            }}
          />
          {formik.touched.content && formik.errors.content && (
            <span>{formik.errors.content}</span>
          )}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              Category
            </label>
            <Select
              options={options}
              value={options.find(
                (option) => option.value === formik.values.category
              )}
              onChange={(selectedOption) =>
                formik.setFieldValue("category", selectedOption.value)
              }
            />
          </div>

          <div className="flex flex-col items-center justify-center bg-gray-50 p-4 shadow rounded-lg">
            <label
              htmlFor="images"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Upload Image
            </label>
            <div className="flex justify-center items-center w-full">
              <input
                id="images"
                type="file"
                name="image"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <label
                htmlFor="images"
                className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
              >
                Choose a file
              </label>
            </div>
          </div>
          {formik.touched.image && formik.errors.image && (
            <p className="text-sm text-red-600">{formik.errors.image}</p>
          )}
          {imageError && <p className="text-sm text-red-600">{imageError}</p>}

          {imagePreview && (
            <div className="mt-2 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="p-4 mt-2 h-48 w-full object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute right-0 top-0 transform translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1"
              >
                <FaTimesCircle className="text-red-500" />
              </button>
            </div>
          )}

          <div className="flex justify-center mt-2">
            <button
              className="p-2 text-white bg-purple-500 hover:bg-pink-600 rounded-2xl"
              type="submit"
            >
              Create Post
            </button>
          </div>
          {isLoading && <div>Creating the post...</div>}
          {isSuccess && <div>Post created successfully</div>}
          {isError && <div>{error.response.data.message} </div>}
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
