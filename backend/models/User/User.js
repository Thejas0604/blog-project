const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
        },
        profileImage: {
            type: Object,
            default: null,
        },
        email: {
            type: String,
            required: false,
        },
        password: {
            type: String,
            required: false,
        },
        googleId: {
            type: String,
            required: false,
        },
        authMethod: {
            type: String,
            enum: ["local", "google"],
            required: true,
            default: "local",
        },
        passwordResetToken: {
            type: String,
            default: null,
        },
        passwordResetTokenExpires: {
            type: Date,
            default: null,
        },
        accountVerificationToken: {
            type: String,
            default: null,
        },
        accountVerificationTokenExpires: {
            type: Date,
            default: null,
        },
        posts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Post",
            },
        ],
        likedPosts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Post",
            },
        ],
        dislikedPosts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Post",
            },
        ],
        comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment",
            },
        ],
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        role: {
            type: String,
            required: true,
            enum: ["admin", "user"],
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
