const express = require("express");
const postRouter = express.Router();
const asyncHandler = require("express-async-handler");
const Post = require("../../models/Post/Post");

//Create post
postRouter.post(
  "/api/v1/posts/create",
  asyncHandler(async (req, res) => {
    const postData = req.body;
    //console.log({title, content});
    const postFound = await Post.findOne({ title: postData.title });
    if (postFound) {
      throw new Error("Post already exists");
    }
    const newPost = await Post.create(postData);
    res.status(201).json({
      status: "success",
      message: "Post created successfully",
      newPost,
    });
  })
);

//get all posts
postRouter.get(
  "/api/v1/posts",
  asyncHandler(async (req, res) => {
    const posts = await Post.find();
    res.status(200).json({
      status: "success",
      posts,
    });
  })
);

//get post by id
postRouter.get(
  "/api/v1/posts/:postId",
  asyncHandler(async (req, res) => {
    const postId = req.params.postId;
    const postFound = await Post.findById(postId);
    res.status(200).json({
      status: "success",
      message: "Post found",
      postFound,
    });
  })
);

//update post
postRouter.put(
  "/api/v1/posts/:postId",
  asyncHandler(async (req, res) => {
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
  })
);

//delete post
postRouter.delete(
    "/api/v1/posts/:postId",
    asyncHandler(async (req, res) => {
      const postId = req.params.postId;
      const deletedPost = await Post.findByIdAndDelete(postId);
      res.status(200).json({
        status: "success",
        message: "Post deleted successfully",
        deletedPost,
      });
    })
  );
  

module.exports = postRouter;