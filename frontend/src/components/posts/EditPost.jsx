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
import { getPostById, updatePost } from "../../services/postsAPI";

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
    const [formData, setFormData] = useState({
        title: "",
        content: "",
    });

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await getPostById(id);
                setFormData({
                    title: response.postFound.title,
                    content: response.postFound.content,
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

        if (!formData.title || !formData.content) {
            setError("Title and content are required");
            return;
        }

        setLoading(true);

        try {
            await updatePost({
                postId: id,
                title: formData.title,
                description: formData.content,
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

                    <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
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
