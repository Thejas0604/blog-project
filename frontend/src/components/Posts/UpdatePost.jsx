import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPostById } from "../../Services/postsAPI";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { updatePost } from "../../Services/postsAPI";

function UpdatePost() {
  const postId = useParams().postId;
  const {data} = useQuery({
    queryKey: ["get-post-details"],
    queryFn: () => getPostById(postId),
  });
  //console.log(data);
  const postMutation = useMutation({
    mutationKey: ["update-post"],
    mutationFn: updatePost,
  });
  const formik = useFormik({
    initialValues: {
      title: data?.postFound?.title || "",
      description: data?.postFound?.content || "",
    },
    enableReinitialize: true, 
    validationSchema: Yup.object({
      title: Yup.string().required("Title is required"),
      description: Yup.string().required("Description is required"),
    }),
    onSubmit: (values) => {
      console.log(values);
      const postData = {
        title: values.title,
        description: values.description,
        postId: postId,
      };
      postMutation.mutate(postData);
    },
  });
  const isLoading = postMutation.isPending;
  const isSuccess = postMutation.isSuccess;
  const isError = postMutation.isError;
  const error = postMutation.error;
  return (
    <div>
      <h1>Editing {data?.postFound.title}</h1>
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
          <button type="submit">Update Post</button>
          {isLoading && <div>Updating the post...</div>}
          {isSuccess && <div>Post updated successfully</div>}
          {isError && <div>{error.message}</div>}
        </form>
      </div>
    </div>
  );
}

export default UpdatePost;
