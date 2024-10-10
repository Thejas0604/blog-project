const User = require("../../models/User/User");
const asyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const userController = {
    //register user
    register: asyncHandler(async (req, res) => {
        const { username, email, password, role } = req.body;
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
            role,
        });
        //response
        res.status(201).json({
            status: "success",
            message: "User registered successfully",
            userRegistered,
        });
    }),
    //login user
    login: asyncHandler(async (req, res) => {
        try {
            //destructuring
            const { username, password } = req.body;
            //find the user
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(404).json({
                    message: `User: ${username} not found`,
                });
            }
            //matching the password
            const isMatchedPW = await bcryptjs.compare(password, user.password);

            if (!isMatchedPW) {
                return res.status(400).json({
                    message: `Invalid credentials`,
                });
            }
            //genearte the token jwt
            const token = jwt.sign(
                {
                    id: user._id,
                    role: user.role,
                },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            //response on a success login
            res.status(200).json({
                message: `Successfully logged in user: ${username}`,
                token,
            });
        } catch (error) {
            res.status(500).json({
                message: `Something went wrong. Error message: ${error.message}`,
                error,
            });
        }
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
                    return res.redirect(
                        "/http://localhost:5173/google-login-error"
                    );
                }
                //generate token
                const token = jwt.sign(
                    { id: user?._id },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: "1d",
                    }
                );
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
};

module.exports = userController;
