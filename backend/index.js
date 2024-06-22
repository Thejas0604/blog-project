require("dotenv").config();
const express = require("express");
const Post = require("./models/Post/Post");
const connectDB = require("./utils/connectDB");
connectDB();
const app = express();

const port = 3000;

//Middleware
app.use(express.json());

//Create post
app.post("/api/v1/posts/create", async (req, res) => {
  try {
    const postData = req.body;
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

//*Todo: Check whether nodemon still needs to be installed or not
