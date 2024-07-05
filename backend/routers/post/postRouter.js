const express = require("express");
const postRouter = express.Router();
const postController = require("../../controllers/posts/postController");
const multer = require("multer");
const storage = require("../../utils/fileUpload");
const upload = multer({ storage: storage });

//Create post
postRouter.post(
  "/posts/create",
  upload.single("image"),
  postController.createPost
);

//get all posts
postRouter.get("/posts", postController.getAllPosts);

//get post by id
postRouter.get("/posts/:postId", postController.getPostById);

//update post
postRouter.put(
  "/posts/:postId",
  upload.single("image"),
  postController.updatePost
);

//delete post
postRouter.delete("/posts/:postId", postController.deletePost);

module.exports = postRouter;
