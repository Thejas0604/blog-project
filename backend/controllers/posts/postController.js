const asyncHandler = require("express-async-handler");
const Post = require("../../models/Post/Post");

postController = {
  //create post
  createPost: asyncHandler(async (req, res) => {
    const postData = req.body;
    //console.log({title, content});
    const newPost = await Post.create(postData);
    res.status(201).json({
      status: "success",
      message: "Post created successfully",
      newPost,
    });
  }),
  //get all posts
  getAllPosts: asyncHandler(async (req, res) => {
    const posts = await Post.find();
    res.status(200).json({
      status: "success",
      posts,
    });
  }),
  //get post by id
  getPostById: asyncHandler(async (req, res) => {
    const postId = req.params.postId;
    const postFound = await Post.findById(postId);
    if (!postFound) {
      throw new Error("Post not found");
    }
    res.status(200).json({
      status: "success",
      message: "Post found",
      postFound,
    });
  }),
  //update post
  updatePost: asyncHandler(async (req, res) => {
    //console.log(req.params);
    const postId = req.params.postId;
    const postFound = await Post.findById(postId);
    if (!postFound) {
      throw new Error("Post not found");
    }
    const postUpdated = await Post.findByIdAndUpdate(
      postId,
      {
        title: req.body.title,
        content: req.body.content,
      },
      {
        new: true,
      }
    );
    res.status(200).json({
      status: "success",
      message: "Post updated successfully",
      postUpdated,
    });
  }),
  //delete post
  deletePost: asyncHandler(async (req, res) => {
    const postId = req.params.postId;
    const deletedPost = await Post.findByIdAndDelete(postId);
    if (!deletedPost) {
      throw new Error("Post not found");
    }
    res.status(200).json({
      status: "success",
      message: "Post deleted successfully",
      deletedPost,
    });
  })
};

module.exports = postController;
