const mongoose = require("mongoose");
const { Schema } = mongoose;

const postSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        postImage: {
            type: Object,
            required: true,
        },
        category: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
                required: true,
            },
        ],
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        likes: {
            type: Number,
        },
        dislikes: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        viewers: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        comments: [
            {
                type: Schema.Types.ObjectId,
                ref: "Comment",
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
