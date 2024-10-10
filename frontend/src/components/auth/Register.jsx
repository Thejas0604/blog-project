import * as React from "react";
import {useState} from "react";
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
import { registerAPI } from "../../services/authAPI";
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

const RegisterContainer = styled(Stack)(({ theme }) => ({
    padding: 20,
    marginTop: "10vh",
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
        WebkitBoxShadow: "0 0 0 1000px #000 inset",
        WebkitTextFillColor: "#fff",
    },
}));

export default function Register() {
    const navigate = useNavigate();
    const [userNameError, setUserNameError] = React.useState(false);
    const [userNameErrorMessage, setUserNameErrorMessage] = React.useState("");
    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
    const [confirmPasswordError, setConfirmPasswordError] =
        React.useState(false);
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] =
        React.useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (validateInputs()) {
            const data = new FormData(event.currentTarget);
            setLoading(true);
            registerAPI({
                username: data.get("username"),
                email: data.get("email"),
                password: data.get("password"),
            })
                .then((response) => {
                    if (response.status === "success") {
                        navigate("/login");
                    } else {
                        console.error(response.message);
                    }
                })
                .catch((error) => {
                    console.error("Registration failed:", error);
                });
        }
    };

    const validateInputs = () => {
        const username = document.getElementById("username");
        const email = document.getElementById("email");
        const password = document.getElementById("password");
        //const confirmPassword = document.getElementById("confirm-password");

        let isValid = true;

        if (!username.value || username.value.length < 3) {
            setUserNameError(true);
            setUserNameErrorMessage(
                "Username must be at least 3 characters long."
            );
            isValid = false;
        } else {
            setUserNameError(false);
            setUserNameErrorMessage("");
        }
        if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
            setEmailError(true);
            setEmailErrorMessage("Please enter a valid email address.");
            isValid = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage("");
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
        // if (!confirmPassword.value || confirmPassword.value != password.value) {
        //     setConfirmPasswordError(true);
        //     setConfirmPasswordErrorMessage("Password not matched.");
        //     isValid = false;
        // } else {
        //     setConfirmPasswordError(false);
        //     setConfirmPasswordErrorMessage("");
        // }

        return isValid;
    };

    return (
        <RegisterContainer direction="column" justifyContent="space-between">
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
                    Register
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
                            error={userNameError}
                            helperText={userNameErrorMessage}
                            id="username"
                            type="text"
                            name="username"
                            placeholder="John Doe"
                            autoComplete="username"
                            autoFocus
                            required
                            fullWidth
                            variant="outlined"
                            color={userNameError ? "error" : "primary"}
                            sx={{ ariaLabel: "username" }}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <CustomTextField
                            error={emailError}
                            helperText={emailErrorMessage}
                            id="email"
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            autoComplete="email"
                            autoFocus
                            required
                            fullWidth
                            variant="outlined"
                            color={emailError ? "error" : "primary"}
                            sx={{ ariaLabel: "email" }}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel htmlFor="password">Password</FormLabel>
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
                    {/* <FormControl>
                        <FormLabel htmlFor="confirm-password">
                            Confirm Password
                        </FormLabel>
                        <CustomTextField
                            error={confirmPasswordError}
                            helperText={confirmPasswordErrorMessage}
                            name="confirm-password"
                            placeholder="••••••"
                            type="confirm-password"
                            id="confirm-password"
                            //autoComplete="current-password"
                            autoFocus
                            required
                            fullWidth
                            variant="outlined"
                            color={confirmPasswordError ? "error" : "primary"}
                        />
                    </FormControl> */}
                    <Button
                        sx={{ mt: "10px" }}
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : "Register"}
                    </Button>
                    <Typography sx={{ textAlign: "center" }}>
                        Already have an account?{" "}
                        <span>
                            <Link href="/login" sx={{ alignSelf: "center" }}>
                                Login
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
              onClick={() => alert('Registerwith Google')}
              startIcon={<GoogleIcon />}
            >
              Register with Google
            </Button>
            <Button
              type="submit"
              fullWidth
              variant="outlined"
              onClick={() => alert('Register with Facebook')}
              startIcon={<FacebookIcon />}
            >
              Register with Facebook
            </Button>
          </Box> */}
            </Card>
        </RegisterContainer>
    );
}
