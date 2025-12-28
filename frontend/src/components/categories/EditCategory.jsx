import React, { useState, useEffect } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import { getCategoryById, updateCategory } from "../../services/categoryAPI";

const StyledCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(4),
    marginTop: theme.spacing(5),
    borderRadius: "10px",
}));

const EditCategory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        categoryName: "",
        categoryDescription: "",
    });

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const response = await getCategoryById(id);
                setFormData({
                    categoryName: response.categoryFound.categoryName,
                    categoryDescription: response.categoryFound.categoryDescription || "",
                });
                setFetchLoading(false);
            } catch (err) {
                console.error("Error fetching category:", err);
                setError("Failed to load category");
                setFetchLoading(false);
            }
        };
        fetchCategory();
    }, [id]);

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
            await updateCategory(id, formData);
            setSuccess(true);
            setTimeout(() => {
                navigate("/categories");
            }, 1500);
        } catch (err) {
            console.error("Error updating category:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to update category. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <Container sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <StyledCard>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    sx={{ textAlign: "center", mb: 3 }}
                >
                    Edit Category
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Category updated successfully! Redirecting...
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
                                "Update Category"
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

export default EditCategory;
