const User = require("../../models/User/User");
const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const userController = {
  //register user
  register: asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    //check if email already exists
    const userFound = await User.findOne({ username, email });
    if (userFound) {
      throw new Error("User already exists");
    }
    //hash the PW
    const hashedPW = await bcryptjs.hash(password, 12);
    //save the user
    const userRegistered = await User.create({
      username,
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
  //login user
  login: asyncHandler(async (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      //console.log(info);
      if (!user) {
        return res.status(401).json({
          status: "fail",
          message: info.message,
        });
      }
      //generate token
      const token = jwt.sign({ id: user?._id }, process.env.JWT_SECRET);
      //console.log(token);
      //set the token in the cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, //1 day
      });
      res.status(200).json({
        status: "success",
        message: "User logged in successfully",
        username: user?.username,
        email: user?.email,
        _id: user?._id,
      });
    })(req, res, next);
  }),
};

module.exports = userController;
