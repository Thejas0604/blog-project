import React, { useContext } from "react";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import GetAllPosts from "./components/posts/GetAllPosts";
import PublicNavbar from "./components/navbar/PublicNav";
import PrivateNavbar from "./components/navbar/PrivateNav";
import Home from "./components/home/Home";
import Login from "./components/auth/Login";
import { AuthContext } from "./context/AuthContext";
import { PostDetails } from "./components/posts/PostDetails";
import CreatePost from "./components/posts/CreatePost";
import EditPost from "./components/posts/EditPost";
import GetAllCategories from "./components/categories/GetAllCategories";
import CreateCategory from "./components/categories/CreateCategory";
import EditCategory from "./components/categories/EditCategory";
import NotFound from "./components/NotFound";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#ff5252",
        },
    },
});

function App() {
    const { user, ready } = useContext(AuthContext);

    // Wait for the cookie session check so protected pages do not flash a redirect.
    if (!ready) return null;

    const adminOnly = (element) => (user ? element : <Navigate to="/login" replace />);

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
                        <Route path="/posts/:id" element={<PostDetails />} />
                        <Route path="/create-post" element={adminOnly(<CreatePost />)} />
                        <Route path="/edit-post/:id" element={adminOnly(<EditPost />)} />
                        <Route path="/categories" element={<GetAllCategories />} />
                        <Route path="/create-category" element={adminOnly(<CreateCategory />)} />
                        <Route path="/edit-category/:id" element={adminOnly(<EditCategory />)} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </ThemeProvider>
    );
}

export default App;
