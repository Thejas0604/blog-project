import * as React from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import ForgotPassword from "./ForgotPassword";
import { loginAPI } from "../../services/authAPI";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";

//import { GoogleIcon, FacebookIcon, SitemarkIcon } from './CustomIcons';

const Card = styled(MuiCard)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignSelf: "center",
    width: "100%",
    padding: theme.spacing(6),
    gap: theme.spacing(4),
    margin: "auto",
    borderRadius: "10px",
    overflow: "hidden",
    [theme.breakpoints.up("sm")]: {
        maxWidth: "450px",
    },
    boxShadow:
        "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
    ...theme.applyStyles("dark", {
        boxShadow:
            "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
    }),
}));

const LoginContainer = styled(Stack)(({ theme }) => ({
    padding: 20,
    marginTop: "10vh",
    borderRadius: "8px",
    "&::before": {
        content: '""',
        display: "block",
        position: "absolute",
        zIndex: -1,
        inset: 0,
    },
}));

const CustomTextField = styled(TextField)(({ theme }) => ({
    "& input:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px #000 inset", // Replace with your background color
        WebkitTextFillColor: "#fff", // Replace with your desired text color
    },
}));

export default function Login() {
    const navigate = useNavigate();
    const [usernameError, setUsernameError] = React.useState(false);
    const [usernameErrorMessage, setUsernameErrorMessage] = React.useState("");
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (validateInputs()) {
            const data = new FormData(event.currentTarget);
            setLoading(true);
            try {
                const response = await loginAPI({
                    username: data.get("username"),
                    password: data.get("password"),
                });
                if (response?.status === 200) {
                    localStorage.setItem("token", response.data.token);
                    console.log("Login successful");
                    navigate("/list");
                } else {
                    setLoginError("Invalid username or password.");
                }
            } catch (error) {
                setLoginError("Invalid username or password.");
            } finally {
                setLoading(false);
            }
        }
    };

    const validateInputs = () => {
        const username = document.getElementById("username");
        const password = document.getElementById("password");

        let isValid = true;

        if (!username.value) {
            setUsernameError(true);
            setUsernameErrorMessage("Please enter a username.");
            isValid = false;
        } else {
            setUsernameError(false);
            setUsernameErrorMessage("");
        }

        if (!password.value || password.value.length < 6) {
            setPasswordError(true);
            setPasswordErrorMessage(
                "Password must be at least 6 characters long."
            );
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage("");
        }

        return isValid;
    };

    return (
        <LoginContainer direction="column" justifyContent="space-between">
            <Card variant="outlined">
                {/* <SitemarkIcon /> */}
                <Typography
                    component="h1"
                    variant="h4"
                    sx={{
                        width: "100%",
                        fontSize: "clamp(2rem, 10vw, 2.15rem)",
                        textAlign: "center",
                    }}
                >
                    Login
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        gap: 2,
                    }}
                >
                    <FormControl>
                        <FormLabel htmlFor="username">Username</FormLabel>
                        <CustomTextField
                            error={usernameError}
                            helperText={usernameErrorMessage}
                            id="username"
                            type="text"
                            name="username"
                            placeholder="your username"
                            autoComplete="username"
                            autoFocus
                            required
                            fullWidth
                            variant="outlined"
                            color={usernameError ? "error" : "primary"}
                            sx={{ ariaLabel: "username" }}
                        />
                    </FormControl>
                    <FormControl>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                            }}
                        >
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <Link
                                component="button"
                                onClick={handleClickOpen}
                                variant="body2"
                                sx={{ alignSelf: "baseline" }}
                            >
                                Forgot your password?
                            </Link>
                        </Box>
                        <CustomTextField
                            error={passwordError}
                            helperText={passwordErrorMessage}
                            name="password"
                            placeholder="••••••"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            autoFocus
                            required
                            fullWidth
                            variant="outlined"
                            color={passwordError ? "error" : "primary"}
                        />
                    </FormControl>
                    <FormControlLabel
                        control={<Checkbox value="remember" color="primary" />}
                        label="Remember me"
                    />
                    {loginError && (
                        <Typography color="error" sx={{ textAlign: "center" }}>
                            {loginError}
                        </Typography>
                    )}
                    <ForgotPassword open={open} handleClose={handleClose} />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : "Login"}
                    </Button>
                    <Typography sx={{ textAlign: "center" }}>
                        Don&apos;t have an account?{" "}
                        <span>
                            <Link href="/register" sx={{ alignSelf: "center" }}>
                                Sign up
                            </Link>
                        </span>
                    </Typography>
                </Box>
                {/* <Divider>or</Divider>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              type="submit"
              fullWidth
              variant="outlined"
              onClick={() => alert('Loginwith Google')}
              startIcon={<GoogleIcon />}
            >
              Login with Google
            </Button>
            <Button
              type="submit"
              fullWidth
              variant="outlined"
              onClick={() => alert('Login with Facebook')}
              startIcon={<FacebookIcon />}
            >
              Login with Facebook
            </Button>
          </Box> */}
            </Card>
        </LoginContainer>
    );
}
