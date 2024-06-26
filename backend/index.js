require("dotenv").config();
const express = require("express");
const Post = require("./models/Post/Post");
const connectDB = require("./utils/connectDB");
connectDB();
const app = express();
const cors = require("cors");

const port = 3000;

//Middleware
app.use(express.json());
const corsOptions = {
  origin: "http://localhost:5173", //In production, this will be the domain of the frontend
  credentials: true,
};
app.use(cors(corsOptions));

//Create post
app.post("/api/v1/posts/create", async (req, res) => {
  try {
    const postData = req.body;
    //console.log(postData);
    const newPost = await Post.create(postData);
    res.status(201).json({
      status: "success",
      message: "Post created successfully",
      newPost,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: "fail",
      message: "Post creation failed",
    });
  }
});
//get all posts
app.get("/api/v1/posts", async (req, res) => {
  try {
    const posts = await Post.find();
    res.status(200).json({
      status: "success",
      posts,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: "fail",
      message: "Failed to get posts",
    });
  }
});

//get post by id
app.get("/api/v1/posts/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const postFound = await Post.findById(postId);
    res.status(200).json({
      status: "success",
      message: "Post found",
      postFound,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: "fail",
      message: "Failed to get post",
    });
  }
});

//update post
app.put("/api/v1/posts/:postId", async (req, res) => {
  console.log(req.params);
  try {
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
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: "fail",
      message: "Post update failed",
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
