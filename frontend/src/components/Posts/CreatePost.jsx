import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { createPost } from "../../Services/postsAPI";

const CreatePost = () => {
  const postMutation = useMutation({
    mutationKey: ["create-post"],
    mutationFn: createPost,
  });
  const formik = useFormik({
    initialValues: {
      title: "",
      description: "",
    },
    validationSchema: Yup.object({
      title: Yup.string().required("Title is required"),
      description: Yup.string().required("Description is required"),
    }),
    onSubmit: (values) => {
      //console.log(values);
      const postData = {
        title: values.title,
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
    <div>
      <form onSubmit={formik.handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Title"
          {...formik.getFieldProps("title")}
        />
        {formik.touched.title && formik.errors.title && (
          <span>{formik.errors.title}</span>
        )}
        <input
          type="text"
          name="description"
          placeholder="Description"
          {...formik.getFieldProps("description")}
        />
        {formik.touched.description && formik.errors.description && (
          <span>{formik.errors.description}</span>
        )}
        <button type="submit">Create Post</button>
        {isLoading && <div>Creating the post...</div>}
        {isSuccess && <div>Post created successfully</div>}
        {isError && <div>{error.response.data.message} </div>}
      </form>
    </div>
  );
};

export default CreatePost;
