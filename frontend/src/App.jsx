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
                {console.log("Current user:", user)}
                <BrowserRouter>
                    {user ? <PrivateNavbar /> : <PublicNavbar />}
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/list" element={<GetAllPosts />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </ThemeProvider>
    );
}

export default App;
