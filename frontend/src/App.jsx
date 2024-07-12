import CreatePost from "./components/Posts/CreatePost";
import GetAllPosts from "./components/Posts/GetAllPosts";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import PublicNavbar from "./components/Navbar/PublicNavbar";
import Home from "./components/Home/Home";
import UpdatePost from "./components/Posts/UpdatePost";
import PostDetails from "./components/Posts/PostDetails";
import Login from "./components/User/Login";
import Register from "./components/User/Register";
import Profile from "./components/User/Profile";
import PrivateNavbar from "./components/Navbar/PrivateNavbar";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import React, { useEffect } from "react";
import { isAuthenticated } from "../redux/slices/authSlices";
import { checkAuthStatus } from "./Services/usersAPI";

function App() {
  //check authenticated status
  const { isError, isLoading, data, error, refetch } = useQuery({
    queryKey: ["user-auth"],
    queryFn: checkAuthStatus,
  });
  //console.log(data);
  //dispatch
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(isAuthenticated(data));
  }, [data]);
  //get the loggedin user
  const { userAuth } = useSelector((state) => state.auth);
  //console.log(userAuth);
  return (
    <div>
      <BrowserRouter>
        {userAuth ? <PrivateNavbar /> : <PublicNavbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/list" element={<GetAllPosts />} />
          <Route path="/posts/:postId" element={<PostDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          {/* <Route path="/posts/update-post/:postId" element={<UpdatePost />} /> */}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
