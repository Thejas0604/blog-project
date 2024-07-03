const express = require("express");
const postRouter = express.Router();
const postController = require("../../controllers/posts/postController");

//Create post
postRouter.post("/api/v1/posts/create", postController.createPost);

//get all posts
postRouter.get("/api/v1/posts", postController.getAllPosts);

//get post by id
postRouter.get("/api/v1/posts/:postId", postController.getPostById);

//update post
postRouter.put("/api/v1/posts/:postId", postController.updatePost);

//delete post
postRouter.delete("/api/v1/posts/:postId", postController.deletePost);

module.exports = postRouter;
