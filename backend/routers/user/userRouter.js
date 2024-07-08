const express = require("express");
const userRouter = express.Router();
const userController = require("../../controllers/users/userController");

//registerUser
userRouter.post("/register", userController.register);
userRouter.post("/login", userController.login);

module.exports = userRouter;
