require("dotenv").config();
const express = require("express");
const Post = require("./models/Post/Post");
const connectDB = require("./utils/connectDB");
connectDB();
const app = express();
const cors = require("cors");
const asyncHandler = require("express-async-handler");

const port = 3000;

//Middleware
app.use(express.json());
const corsOptions = {
  origin: "http://localhost:5173", //In production, this will be the domain of the frontend
  credentials: true,
};
app.use(cors(corsOptions));

//Create post
app.post(
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
app.get(
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
app.get(
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
app.put(
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
app.delete(
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

//404 error handling middleware
app.use((req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Cannot find route on this server`,
  });
});

//error handling middleware
app.use((err, req, res, next) => {
  //console.log(err);
  const stack = err.stack;
  const message = err.message;
  console.log(message);
  res.status(500).json({
    status: "fail",
    message,
    stack,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
