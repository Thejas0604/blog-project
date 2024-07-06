import React from "react";
import { deletePost, getAllPosts } from "../../Services/postsAPI";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import "./styles.css";

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
      <div className="flex flex-wrap mb-32 -mx-4 p-20">
        {data?.posts?.map((post) => (
          <div key={post._id} className="w-full md:w-1/2 lg:w-1/3 p-4">
            <Link to={`/posts/${post._id}`}>
              <div className="bg-white border border-gray-100 hover:border-orange-500 transition duration-200 rounded-2xl h-full p-3">
                <div className="relative" style={{ height: 240 }}>
                  <div className="absolute top-0 left-0 z-10"></div>
                  <div className="absolute bottom-0 right-0 z-10"></div>
                  <img
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    src={post?.postImage?.path}
                    // src="https://cdn.pixabay.com/photo/2017/08/01/02/10/dark-2562840_1280.jpg"
                    alt={post?.content}
                  />
                </div>
                <div className="pt-6 pb-3 px-4">
                  <div
                    className="rendered-html-content mb-2"
                    dangerouslySetInnerHTML={{
                      __html: post?.content,
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-gray-500 text-sm">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>

                    <div className="py-1 px-2 rounded-md border border-gray-100 text-xs font-medium text-gray-700 inline-block">
                      {post?.category?.categoryName}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <div className="flex ">
              <div className="p-2 text-white bg-purple-500 hover:bg-pink-600 rounded-r-lg">
                <Link to={`/posts/update-post/${post._id}`}>
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
