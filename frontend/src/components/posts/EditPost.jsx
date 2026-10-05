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
import { useNavigate, useParams } from "react-router-dom";
import { getPostById, updatePost } from "../../services/postsAPI";
import { getAllCategories } from "../../services/categoryAPI";
import MarkdownEditor from "./MarkdownEditor";

const StyledCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(4),
    marginTop: theme.spacing(5),
    borderRadius: "10px",
}));

const EditPost = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        category: "",
    });

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const [response, cats] = await Promise.all([
                    getPostById(id),
                    getAllCategories(),
                ]);
                setCategories(cats.categories || []);
                setFormData({
                    title: response.postFound.title,
                    content: response.postFound.content,
                    category: response.postFound.category || "",
                });
                setFetchLoading(false);
            } catch (err) {
                console.error("Error fetching post:", err);
                setError("Failed to load post");
                setFetchLoading(false);
            }
        };
        fetchPost();
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

        if (uploading) {
            setError("Please wait for the image upload to finish");
            return;
        }

        if (!formData.title || !formData.content) {
            setError("Title and content are required");
            return;
        }

        setLoading(true);

        try {
            await updatePost({
                postId: id,
                title: formData.title,
                content: formData.content,
                category: formData.category || null,
            });
            setSuccess(true);
            setTimeout(() => {
                navigate(`/posts/${id}`);
            }, 1500);
        } catch (err) {
            console.error("Error updating post:", err);
            setError(err.response?.data?.message || "Failed to update post. Please try again.");
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
                    Edit Post
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Post updated successfully! Redirecting...
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

                    <MarkdownEditor
                        value={formData.content}
                        onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                        onBusyChange={setUploading}
                        disabled={loading}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            label="Category"
                            disabled={loading}
                        >
                            <MenuItem value="">None</MenuItem>
                            {categories.map((cat) => (
                                <MenuItem key={cat._id} value={cat._id}>
                                    {cat.categoryName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading || uploading}
                        >
                            {loading ? <CircularProgress size={24} /> : "Update Post"}
                        </Button>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate(`/posts/${id}`)}
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

export default EditPost;
