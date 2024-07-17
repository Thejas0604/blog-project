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
  //google auth
  googleAuth: passport.authenticate("google", { scope: ["profile"] }),
  //google auth callback
  googleAuthCallback: asyncHandler(async (req, res, next) => {
    passport.authenticate(
      "google",
      {
        failureRedirect: "/login",
        session: false,
      },
      (err, user, info) => {
        if (err) return next(err);
        if (!user) {
          return res.redirect("/http://localhost:5173/google-login-error");
        }
        //generate token
        const token = jwt.sign({ id: user?._id }, process.env.JWT_SECRET, {
          expiresIn: "1d",
        });
        //set the token in the cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, //1 day
        });
        res.redirect("http://localhost:5173/");
      }
    )(req, res, next);
  }),
  //chech isAuthenticted
  checkAuthenticated: asyncHandler(async (req, res) => {
    const token = req.cookies["token"];
    //console.log(token);
    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "User not authenticated",
        isAuthenticated: false,
      });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded?.id);
      //console.log(user);
      if (!user) {
        return res.status(401).json({
          status: "fail",
          message: "User not authenticated",
          isAuthenticated: false,
        });
      } else {
        return res.status(200).json({
          status: "success",
          message: "User authenticated",
          isAuthenticated: true,
          username: user.username,
          email: user.email,
          _id: user._id,
          profilImage: user.profileImage,
        });
      }
    } catch (error) {
      return res.status(401).json({
        status: "fail",
        message: "User not authenticated",
        isAuthenticated: false,
        error,
      });
    }
  }),
  //logout
  logout: async (req, res) => {
    res.cookie("token", "", {
      maxAge: 1,
    });
    res.status(200).json({
      status: "success",
      message: "Successfully logout",
    });
  },
};

module.exports = userController;
