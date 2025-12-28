import React from "react";
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const CategoryCard = ({ category, onDelete, isAdmin }) => {
    const navigate = useNavigate();

    const handleEdit = () => {
        navigate(`/edit-category/${category._id}`);
    };

    return (
        <Card
            sx={{
                minWidth: 275,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: "10px",
            }}
        >
            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="div" gutterBottom>
                    {category.categoryName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {category.categoryDescription || "No description"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
                    {category.posts?.length || 0} posts
                </Typography>
            </CardContent>
            {isAdmin && (
                <CardActions sx={{ justifyContent: "flex-end" }}>
                    <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={handleEdit}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => onDelete(category._id)}
                        color="error"
                    >
                        Delete
                    </Button>
                </CardActions>
            )}
        </Card>
    );
};

export default CategoryCard;
