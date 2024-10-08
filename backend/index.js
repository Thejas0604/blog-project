require("dotenv").config();
const express = require("express");
const connectDB = require("./utils/connectDB");
connectDB();
const app = express();
const cors = require("cors");
const postRouter = require("./routers/post/postRouter");
const userRouter = require("./routers/user/userRouter");
const passport = require("./utils/passport-config");
const cookieParser = require("cookie-parser");
const categoryRouter = require("./routers/category/categoryRouter");

const port = 3000;

//Middleware
app.use(express.json());
const corsOptions = {
  origin: "http://localhost:5173", //In production, this will be the domain of the frontend
  credentials: true,
};
app.use(cors(corsOptions));
app.use(passport.initialize());
//pass cookie header to the request object
app.use(cookieParser());
//mounting the postRouter
app.use("/api/v1/posts", postRouter);
//mounting the userRouter
app.use("/api/v1/user", userRouter);
//mounting the categoryRouter
app.use("/api/v1/categories", categoryRouter);

//404 error handling middleware
app.use((req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Cannot find route on this server`,
  });
});

//error handling middleware
app.use((err, req, res, next) => {
  //console.log(err);
  const stack = err.stack;
  const message = err.message;
  //console.log(message);
  res.status(500).json({
    status: "fail",
    message,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
