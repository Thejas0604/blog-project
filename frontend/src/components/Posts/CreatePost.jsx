import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { createPost } from "../../Services/postsAPI";
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';

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
    <div>
      <form onSubmit={formik.handleSubmit}>
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
        <button type="submit">Create Post</button>
        {isLoading && <div>Creating the post...</div>}
        {isSuccess && <div>Post created successfully</div>}
        {isError && <div>{error.response.data.message} </div>}
      </form>
    </div>
  );
};

export default CreatePost;
