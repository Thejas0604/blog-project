const User = require("../../models/User/User");
const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");

const userController = {
  //register user
  register: asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;
    //check if email already exists
    const userFound = await User.findOne({ userName, email });
    if (userFound) {
      throw new Error("User already exists");
    }
    //hash the PW
    const hashedPW = await bcryptjs.hash(password, 12);
    //save the user
    const userRegistered = await User.create({
      userName,
      email,
      password: hashedPW,
    });
    //response
    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      userRegistered,
    });
  }),
};

module.exports = userController;
