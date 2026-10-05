import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPostById, deletePost } from "../../services/postsAPI";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CardActions from "@mui/material/CardActions";
import Container from "@mui/material/Container";
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Box } from "@mui/material";
import PostContent from "./PostContent";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getCategoryById } from "../../services/categoryAPI";
import { AuthContext } from "../../context/AuthContext";

export const PostDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [post, setPost] = useState(null);
    const [error, setError] = useState(null);
    const [categoryName, setCategoryName] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const fetchedPost = await getPostById(id);
                setPost(fetchedPost);
                const catId = fetchedPost.postFound.category;
                if (catId) {
                    const cat = await getCategoryById(catId);
                    setCategoryName(cat.categoryFound.categoryName);
                }
            } catch (err) {
                setError(err.message);
            }
        };
        fetchPost();
    }, [id]);

    const handleEdit = () => {
        navigate(`/edit-post/${id}`);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deletePost(id);
            navigate("/list");
        } catch (err) {
            console.error("Error deleting post:", err);
            setError("Failed to delete post");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    if (error) return <div>Error: {error}</div>;
    if (!post)
        return (
            <Container
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "80vh",
                    margin: "10rem",
                }}
            >
                <CircularProgress />
            </Container>
        );

    return (
        <Container
            sx={{
                display: "flex",
                justifyContent: "center",
            }}
        >
            <Card
                sx={{
                    mb: "10px",
                    mt: "20px",
                    borderRadius: "10px",
                }}
            >
                <CardContent>
                    <Typography gutterBottom variant="h4" component="h1">
                        {post.postFound.title}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block", mb: 2 }}
                    >
                        {categoryName ? `${categoryName} | ` : ""}
                        {new Date(post.postFound.createdAt).toLocaleDateString()}
                    </Typography>
                    <PostContent content={post.postFound.content} />
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", px: 2 }}>
                    {user && (
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={handleEdit}
                                variant="outlined"
                            >
                                Edit
                            </Button>
                            <Button
                                size="small"
                                startIcon={<DeleteIcon />}
                                onClick={() => setDeleteDialogOpen(true)}
                                variant="outlined"
                                color="error"
                            >
                                Delete
                            </Button>
                        </Box>
                    )}
                </CardActions>
            </Card>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this post? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                    >
                        {deleting ? <CircularProgress size={20} /> : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};
