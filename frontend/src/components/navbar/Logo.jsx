import * as React from "react";
import Typography from "@mui/material/Typography";

// Centered in the toolbar on mobile, sits in the flex row (right side) on desktop.
export default function Logo() {
    return (
        <Typography
            component="a"
            href="/"
            variant="h6"
            aria-label="BlogMe home"
            sx={{
                position: { xs: "absolute", md: "static" },
                left: { xs: "50%", md: "auto" },
                transform: { xs: "translateX(-50%)", md: "none" },
                mr: { md: 2 },
                fontWeight: 300,
                fontSize: "1.5rem",
                lineHeight: 1,
                color: "text.primary",
                textDecoration: "none",
            }}
        >
            Blog
            <Typography
                component="span"
                sx={{ fontSize: "inherit", color: "primary.light" }}
            >
                Me
            </Typography>
        </Typography>
    );
}
