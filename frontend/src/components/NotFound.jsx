import { Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <Container sx={{ textAlign: "center", mt: 10 }}>
            <Typography variant="h3" component="h1" gutterBottom>
                404
            </Typography>
            <Typography sx={{ mb: 3 }}>Page not found.</Typography>
            <Button variant="contained" onClick={() => navigate("/")}>
                Back home
            </Button>
        </Container>
    );
}
