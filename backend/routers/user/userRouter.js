const express = require("express");
const userRouter = express.Router();
const userController = require("../../controllers/users/userController");

//registerUser
userRouter.post("/register", userController.register);
userRouter.post("/login", userController.login);
userRouter.get("/auth/google", userController.googleAuth);
userRouter.get("/auth/google/callback", userController.googleAuthCallback);

module.exports = userRouter;
