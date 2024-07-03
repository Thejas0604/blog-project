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
      <div className="flex flex-wrap mb-32 -mx-4">
        {data?.posts.map((post) => (
          <div key={post._id} className="w-full md:w-1/2 lg:w-1/3 p-4">
            <div
              className="bg-white border border-gray-100 hover:border-purple-500 transition duration-200 rounded-2xl h-full p-3"
              dangerouslySetInnerHTML={{ __html: post?.content }}
            />
            <div className="flex ">
              <div className="p-2 text-white bg-purple-500 hover:bg-pink-600 rounded-r-lg">
                <Link to={`/posts/${post._id}`}>
                  <button>Edit</button>
                </Link>
              </div>
              <div className="p-2 text-white bg-purple-500 hover:bg-pink-600 rounded-r-lg">
                <button onClick={() => handleDelete(post?._id)}>
                  Delete Post
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GetAllPosts;
