import React, { useState, useEffect, useContext } from "react";
import {
    Box,
    Container,
    Grid,
    Typography,
    CircularProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
} from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import { useNavigate } from "react-router-dom";
import CategoryCard from "./CategoryCard";
import { getAllCategories, deleteCategory } from "../../services/categoryAPI";
import { AuthContext } from "../../context/AuthContext";
import AddIcon from "@mui/icons-material/Add";

const GetAllCategories = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await getAllCategories();
            setCategories(response.categories || []);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching categories:", err);
            setError("Failed to load categories");
            setLoading(false);
        }
    };

    const handleDeleteClick = (categoryId) => {
        setCategoryToDelete(categoryId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteCategory(categoryToDelete);
            setCategories(categories.filter((cat) => cat._id !== categoryToDelete));
            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
        } catch (err) {
            console.error("Error deleting category:", err);
            setError("Failed to delete category");
        } finally {
            setDeleting(false);
        }
    };

    // Check if user is admin (you'll need to implement role checking in AuthContext)
    const isAdmin = user?.role === "admin" || false;

    if (loading) {
        return (
            <Container
                sx={{ display: "flex", justifyContent: "center", mt: 10 }}
            >
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container sx={{ mt: 5 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 4,
                }}
            >
                <Typography variant="h4" component="h1">
                    Categories
                </Typography>
                {isAdmin && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate("/create-category")}
                    >
                        Create Category
                    </Button>
                )}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid2 container spacing={3}>
                {categories.length > 0 ? (
                    categories.map((category) => (
                        <Grid2 size={4} key={category._id}>
                            <CategoryCard
                                category={category}
                                onDelete={handleDeleteClick}
                                isAdmin={isAdmin}
                            />
                        </Grid2>
                    ))
                ) : (
                    <Grid2 size={12}>
                        <Typography
                            variant="body1"
                            sx={{ textAlign: "center", mt: 4 }}
                        >
                            No categories available
                        </Typography>
                    </Grid2>
                )}
            </Grid2>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this category? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={deleting}
                    >
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

export default GetAllCategories;
