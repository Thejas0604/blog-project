const asyncHandler = require("express-async-handler");
const Post = require("../../models/Post/Post");
const Category = require("../../models/Category/Category");

likeController = {
    //create post
    createPost: asyncHandler(async (req, res) => {
        const { title, content, category } = req.body;
        const categoryNew = Category.findOne({ category });
        const newPost = await Post.create({
            title,
            content,
            categoryNew,
            postImage: req.file,
            author: req.user.id,
        });
        res.status(201).json({
            status: "success",
            message: "Post created successfully",
            newPost,
        });
    }),
};

module.exports = likeController;
