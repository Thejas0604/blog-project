import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Container,
    Card,
    CircularProgress,
    Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { createPost } from "../../services/postsAPI";
import { getAllCategories } from "../../services/categoryAPI";

const StyledCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(4),
    marginTop: theme.spacing(5),
    borderRadius: "10px",
}));

const CreatePost = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        category: "",
        image: null,
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await getAllCategories();
                setCategories(response.categories || []);
            } catch (err) {
                console.error("Error fetching categories:", err);
                setError("Failed to load categories");
            }
        };
        fetchCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prev) => ({
                ...prev,
                image: file,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Validation
        if (!formData.title || !formData.content || !formData.category || !formData.image) {
            setError("All fields are required");
            return;
        }

        setLoading(true);

        try {
            const postFormData = new FormData();
            postFormData.append("title", formData.title);
            postFormData.append("content", formData.content);
            postFormData.append("category", formData.category);
            postFormData.append("image", formData.image);

            await createPost(postFormData);
            setSuccess(true);
            setTimeout(() => {
                navigate("/list");
            }, 1500);
        } catch (err) {
            console.error("Error creating post:", err);
            setError(err.response?.data?.message || "Failed to create post. Please try again.");
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
                    Create New Post
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Post created successfully! Redirecting...
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        fullWidth
                        label="Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        margin="normal"
                        required
                        disabled={loading}
                    />

                    <TextField
                        fullWidth
                        label="Content"
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        margin="normal"
                        required
                        multiline
                        rows={6}
                        disabled={loading}
                    />

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Category</InputLabel>
                        <Select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            label="Category"
                            disabled={loading}
                        >
                            {categories.map((cat) => (
                                <MenuItem key={cat._id} value={cat._id}>
                                    {cat.categoryName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ mt: 2, mb: 2 }}>
                        <Button variant="outlined" component="label" fullWidth>
                            Upload Image
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={loading}
                            />
                        </Button>
                        {formData.image && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Selected: {formData.image.name}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : "Create Post"}
                        </Button>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate("/list")}
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

export default CreatePost;
