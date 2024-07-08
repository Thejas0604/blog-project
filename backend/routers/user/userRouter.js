const express = require("express");
const userRouter = express.Router();
const userController = require("../../controllers/users/userController");


//registerUser
userRouter.post("/register", userController.register);

module.exports = userRouter;