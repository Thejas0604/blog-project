import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router-dom";

export default function Hero() {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate("/list");
    };
    return (
        <Box id="hero">
            <Container
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: { xs: 14, sm: 20 },
                    pb: { xs: 8, sm: 12 },
                }}
            >
                <Stack
                    spacing={2}
                    useFlexGap
                    sx={{
                        alignItems: "center",
                        width: { xs: "100%", sm: "70%" },
                    }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: "center",
                            fontSize: "clamp(3rem, 10vw, 3.5rem)",
                        }}
                    >
                        Blog
                        <Typography
                            component="span"
                            variant="h1"
                            sx={(theme) => ({
                                fontSize: "inherit",
                                color: "primary.main",
                                ...theme.applyStyles("dark", {
                                    color: "primary.light",
                                }),
                            })}
                        >
                            Me
                        </Typography>
                    </Typography>
                    <Typography
                        sx={{
                            textAlign: "center",
                            color: "text.secondary",
                            width: { sm: "100%", md: "80%" },
                        }}
                    >
                        Discover insightful articles, tips, and stories from a
                        diverse community of bloggers. Whether you're looking
                        for inspiration, advice, or just a good read, you'll
                        find it here.
                        <br /> Join us and start your blogging journey today!
                    </Typography>
                    <Button
                        onClick={handleClick}
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{ minWidth: "fit-content" }}
                    >
                        Read Blogs
                    </Button>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: "center" }}
                    >
                        By clicking &quot;Get started&quot; you agree to
                        our&nbsp;
                        <Link href="#" color="primary">
                            Terms & Conditions
                        </Link>
                        .
                    </Typography>
                </Stack>
            </Container>
        </Box>
    );
}
