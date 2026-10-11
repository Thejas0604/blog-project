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
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchField from "../SearchField";
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
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const setQuery = (q) => setSearchParams(q ? { q } : {}, { replace: true });

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

    // Only the logged-in owner sees write controls.
    const isAdmin = Boolean(user);

    if (loading) {
        return (
            <Container
                sx={{ display: "flex", justifyContent: "center", mt: 10 }}
            >
                <CircularProgress />
            </Container>
        );
    }

    const needle = query.trim().toLowerCase();
    const visibleCategories = needle
        ? categories.filter((c) =>
              [c.categoryName, c.categoryDescription]
                  .filter(Boolean)
                  .some((t) => t.toLowerCase().includes(needle))
          )
        : categories;

    return (
        <Container sx={{ mt: { xs: 2, sm: 5 } }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    mb: { xs: 2, sm: 4 },
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

            <Box sx={{ mb: 3 }}>
                <SearchField value={query} onChange={setQuery} placeholder="Search categories" />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid2 container spacing={3}>
                {visibleCategories.length > 0 ? (
                    visibleCategories.map((category) => (
                        <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={category._id}>
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
                            {needle ? "No categories match your search" : "No categories available"}
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
