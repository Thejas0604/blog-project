import React from "react";
import { getAllPosts } from "../../Services/postsAPI";
import { useQuery } from "@tanstack/react-query";

function GetAllPosts() {
  const { isError, isLoading, data, error } = useQuery({
    queryKey: ["all-posts"],
    queryFn: getAllPosts,
  });
  console.log(data);
  return (
    <div>
      {isLoading && <div>Posts loading</div>}
      {isError && <div>{error.message}</div>}
      
      {data &&
        data.posts.map((post) => (
          <div key={post._id}>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
          </div>
        ))}
    </div>
  );
}

export default GetAllPosts;
