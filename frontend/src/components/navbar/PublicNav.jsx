import * as React from "react";
import { styled, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Drawer from "@mui/material/Drawer";
import MenuIcon from "@mui/icons-material/Menu";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Link from "@mui/material/Link";
//import Logo from "../../assets/react.svg";

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
    backdropFilter: "blur(24px)",
    border: "1px solid",
    borderColor: theme.palette.divider,
    backgroundColor: alpha(theme.palette.background.default, 0.4),
    boxShadow: theme.shadows[1],
    padding: "8px 12px",
}));

export default function PublicNavbar() {
    const [open, setOpen] = React.useState(false);

    const toggleDrawer = (newOpen) => () => {
        setOpen(newOpen);
    };

    return (
        <AppBar
            position="sticky"
            sx={{
                boxShadow: 0,
                bgcolor: "transparent",
                backgroundImage: "none",
                mt: 5,
            }}
        >
            <Container maxWidth="lg">
                <StyledToolbar variant="regular" disableGutters>
                    <Box
                        sx={{
                            flexGrow: 1,
                            display: "flex",
                            alignItems: "center",
                            px: 0,
                        }}
                    >
                        {/* {Logo} */}
                        <Box sx={{ display: { xs: "none", md: "flex" } }}>
                            <Link href="/">
                                <Button
                                    variant="text"
                                    color="primary"
                                    size="large"
                                    sx={{ minWidth: 0 }}
                                >
                                    Home
                                </Button>
                            </Link>
                            <Link href="/list">
                                <Button
                                    variant="text"
                                    color="primary"
                                    size="large"
                                    sx={{ minWidth: 0 }}
                                >
                                    View Blogs
                                </Button>
                            </Link>
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            display: { xs: "none", md: "flex" },
                            gap: 1,
                            alignItems: "center",
                        }}
                    >
                        <Link href="/login">
                            <Button color="primary" variant="text" size="small">
                                Login
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button
                                color="primary"
                                variant="contained"
                                size="small"
                            >
                                Register
                            </Button>
                        </Link>
                    </Box>
                    {/* Mobile view, have to optimize */}
                    <Box sx={{ display: { sm: "flex", md: "none" } }}>
                        <IconButton
                            aria-label="Menu button"
                            onClick={toggleDrawer(true)}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Drawer
                            anchor="top"
                            open={open}
                            onClose={toggleDrawer(false)}
                        >
                            <Box
                                sx={{
                                    p: 2,
                                    backgroundColor: "background.default",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <IconButton onClick={toggleDrawer(false)}>
                                        <CloseRoundedIcon />
                                    </IconButton>
                                </Box>
                                <Divider sx={{ my: 3 }} />
                                <MenuItem>
                                    <Link href="/list">View Blogs</Link>
                                </MenuItem>
                                <MenuItem>
                                    <Link href="/register">
                                        <Button
                                            color="primary"
                                            variant="contained"
                                            fullWidth
                                        >
                                            Register
                                        </Button>
                                    </Link>
                                </MenuItem>
                                <MenuItem>
                                    <Link href="/login">
                                        <Button
                                            color="primary"
                                            variant="outlined"
                                            fullWidth
                                        >
                                            Login
                                        </Button>
                                    </Link>
                                </MenuItem>
                            </Box>
                        </Drawer>
                    </Box>
                </StyledToolbar>
            </Container>
        </AppBar>
    );
}
