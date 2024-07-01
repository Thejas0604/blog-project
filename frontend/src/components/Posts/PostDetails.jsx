import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPostById } from "../../Services/postsAPI";

function PostDetails() {
  const postId = useParams().postId;
  const { isError, isLoading, data, error } = useQuery({
    queryKey: ["post-details"],
    queryFn: () => getPostById(postId),
  });
  console.log(data);

  return (
    <div>
      <h1>{data?.postFound.title}</h1>
      <h1>{data?.postFound.content}</h1>
      
    </div>
  );
}

export default PostDetails;
