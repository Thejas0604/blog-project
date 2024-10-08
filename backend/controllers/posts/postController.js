const asyncHandler = require("express-async-handler");
const Post = require("../../models/Post/Post");
const Category = require("../../models/Category/Category");

postController = {
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
            likes: 0,
        });
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
    }),
    //increment likes
    incrementLikes: asyncHandler(async (req, res) => {
        const postId = req.params.postId;   
        const postFound = await Post.findById(postId);
        if (!postFound) {
            throw new Error("Post not found");
        }
        postFound.likes += 1;
        await postFound.save();
        res.status(200).json({
            status: "success",
            message: "Likes incremented successfully",
            postFound,
        });
    }),
};

module.exports = postController;
