import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPostById, likePost, deletePost } from "../../services/postsAPI";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import Container from "@mui/material/Container";
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { AuthContext } from "../../context/AuthContext";

export const PostDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [post, setPost] = useState(null);
    const [error, setError] = useState(null);
    const [liking, setLiking] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const fetchedPost = await getPostById(id);
                setPost(fetchedPost);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchPost();
    }, [id]);

    const handleLike = async () => {
        if (!user) {
            navigate("/login");
            return;
        }
        setLiking(true);
        try {
            const response = await likePost(id);
            setPost((prev) => ({
                ...prev,
                postFound: {
                    ...prev.postFound,
                    likes: response.postFound.likes,
                },
            }));
        } catch (err) {
            console.error("Error liking post:", err);
        } finally {
            setLiking(false);
        }
    };

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
                <CardActionArea>
                    <CardMedia
                        component="img"
                        sx={{
                            height: "auto",
                            maxHeight: 500,
                            objectFit: "contain",
                        }}
                        image={post.postFound.postImage.path}
                        alt="Post Image"
                    />
                    <CardContent>
                        <Typography gutterBottom variant="h5" component="div">
                            {post.postFound.title}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: "text.secondary",
                            }}
                        >
                            {post.postFound.content}
                        </Typography>
                    </CardContent>
                </CardActionArea>
                <CardActions sx={{ justifyContent: "space-between", px: 2 }}>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <IconButton
                            color="primary"
                            onClick={handleLike}
                            disabled={liking || !user}
                        >
                            <FavoriteIcon />
                        </IconButton>
                        <Typography variant="body2">
                            {post.postFound.likes || 0} likes
                        </Typography>
                    </Box>
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
