import React, { useContext } from "react";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import GetAllPosts from "./components/posts/GetAllPosts";
import PublicNavbar from "./components/navbar/PublicNav";
import PrivateNavbar from "./components/navbar/PrivateNav";
import Home from "./components/home/Home";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import { AuthContext } from "./context/AuthContext";
import { PostDetails } from "./components/posts/PostDetails";
import CreatePost from "./components/posts/CreatePost";
import EditPost from "./components/posts/EditPost";
import GetAllCategories from "./components/categories/GetAllCategories";
import CreateCategory from "./components/categories/CreateCategory";
import EditCategory from "./components/categories/EditCategory";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#ff5252",
        },
    },
});

function App() {
    const { user } = useContext(AuthContext);
    //console.log(user);

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div>
                <BrowserRouter>
                    {user ? <PrivateNavbar /> : <PublicNavbar />}
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/list" element={<GetAllPosts />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/posts/:id" element={<PostDetails />} />
                        <Route path="/create-post" element={<CreatePost />} />
                        <Route path="/edit-post/:id" element={<EditPost />} />
                        <Route path="/categories" element={<GetAllCategories />} />
                        <Route path="/create-category" element={<CreateCategory />} />
                        <Route path="/edit-category/:id" element={<EditCategory />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </ThemeProvider>
    );
}

export default App;
