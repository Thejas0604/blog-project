const express = require("express");
const postRouter = express.Router();
const postController = require("../../controllers/posts/postController");
const multer = require("multer");
const storage = require("../../utils/fileUpload");
const isAuthenticated = require("../../middleware/isAuthenticated");
const upload = multer({ storage: storage });

//Create post
postRouter.post(
  "/create",
  isAuthenticated,
  upload.single("image"),
  postController.createPost
);

//get all posts
postRouter.get("/", postController.getAllPosts);

//get post by id
postRouter.get("/:postId", postController.getPostById);

//update post
postRouter.put("/:postId", upload.single("image"), postController.updatePost);

//delete post
postRouter.delete("/:postId", postController.deletePost);

module.exports = postRouter;
