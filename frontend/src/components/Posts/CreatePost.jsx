import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { createPost } from "../../Services/postsAPI";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const CreatePost = () => {
  const [description, setDescription] = useState("");

  const postMutation = useMutation({
    mutationKey: ["create-post"],
    mutationFn: createPost,
  });
  const formik = useFormik({
    initialValues: {
      description: "",
    },
    validationSchema: Yup.object({
      description: Yup.string().required("Description is required"),
    }),
    onSubmit: (values) => {
      //console.log(values);
      const postData = {
        description: values.description,
      };
      postMutation.mutate(postData);
    },
  });
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
            value={formik.values.description}
            theme="snow"
            onChange={(value) => {
              setDescription(value);
              formik.setFieldValue("description", value);
            }}
          />
          {formik.touched.description && formik.errors.description && (
            <span>{formik.errors.description}</span>
          )}
          <div>Category</div>
          <div className="bg-gray-100 p-4 ">
            <div className="text-center">Upload Image</div>
            <div className="flex justify-center mt-2">
              <button className="p-2 text-white bg-blue-500 rounded-2xl">
                Choose a file
              </button>
            </div>
          </div>
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
