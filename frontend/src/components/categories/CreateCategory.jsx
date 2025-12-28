import React, { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    Card,
    CircularProgress,
    Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { createCategory } from "../../services/categoryAPI";

const StyledCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(4),
    marginTop: theme.spacing(5),
    borderRadius: "10px",
}));

const CreateCategory = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        categoryName: "",
        categoryDescription: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!formData.categoryName) {
            setError("Category name is required");
            return;
        }

        setLoading(true);

        try {
            await createCategory(formData);
            setSuccess(true);
            setTimeout(() => {
                navigate("/categories");
            }, 1500);
        } catch (err) {
            console.error("Error creating category:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to create category. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <StyledCard>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    sx={{ textAlign: "center", mb: 3 }}
                >
                    Create New Category
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Category created successfully! Redirecting...
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        fullWidth
                        label="Category Name"
                        name="categoryName"
                        value={formData.categoryName}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                    />

                    <TextField
                        fullWidth
                        label="Category Description"
                        name="categoryDescription"
                        value={formData.categoryDescription}
                        onChange={handleChange}
                        margin="normal"
                        multiline
                        rows={4}
                        disabled={loading}
                    />

                    <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                        >
                            {loading ? (
                                <CircularProgress size={24} />
                            ) : (
                                "Create Category"
                            )}
                        </Button>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate("/categories")}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </StyledCard>
        </Container>
    );
};

export default CreateCategory;
