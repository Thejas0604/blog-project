const express = require("express");
const postRouter = express.Router();
const postController = require("../../controllers/posts/postController");

//Create post
postRouter.post("/posts/create", postController.createPost);

//get all posts
postRouter.get("/posts", postController.getAllPosts);

//get post by id
postRouter.get("/posts/:postId", postController.getPostById);

//update post
postRouter.put("/posts/:postId", postController.updatePost);

//delete post
postRouter.delete("/posts/:postId", postController.deletePost);

module.exports = postRouter;
