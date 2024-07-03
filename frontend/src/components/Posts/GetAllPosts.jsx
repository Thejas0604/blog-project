import React from "react";
import { deletePost, getAllPosts } from "../../Services/postsAPI";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

function GetAllPosts() {
  const { isError, isLoading, data, error, refetch } = useQuery({
    queryKey: ["all-posts"],
    queryFn: getAllPosts,
  });

  const postMutation = useMutation({
    mutationKey: ["delete-post"],
    mutationFn: deletePost,
  });
  //delete handler
  const handleDelete = async (postId) => {
    postMutation
      .mutateAsync(postId)
      .then(() => {
        refetch();
      })
      .catch((error) => console.log(error));
  };
  //console.log(data);
  return (
    <div>
      {isLoading && <div>Posts loading</div>}
      {isError && <div>{error.message}</div>}
      {data &&
        data.posts.map((post) => (
          <div key={post._id}>
            <div
            dangerouslySetInnerHTML={{__html:post?.content}}/>
            <Link to={`/posts/${post._id}`}>
              <button>Edit</button>
            </Link>
            <button onClick={() => handleDelete(post?._id)}>Delete Post</button>
          </div>
        ))}
    </div>
  );
}

export default GetAllPosts;
