import React from "react";
import PostCard from "./PostCard";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Container from "@mui/material/Container";
import { useState, useEffect } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import SearchField from "../SearchField";
import { getAllPosts } from "../../services/postsAPI";
import { getAllCategories, getCategoryById } from "../../services/categoryAPI";

function GetAllPosts() {
    const { categoryId } = useParams();
    const [posts, setPosts] = useState([]);
    const [category, setCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const setQuery = (q) => setSearchParams(q ? { q } : {}, { replace: true });
    const [categoryNames, setCategoryNames] = useState({});
    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            setCategory(null);
            try {
                const fetchedPosts = await getAllPosts(categoryId);
                if (categoryId) {
                    const res = await getCategoryById(categoryId);
                    setCategory(res.categoryFound);
                }
                setPosts(fetchedPosts);
                const cats = await getAllCategories();
                setCategoryNames(
                    Object.fromEntries(
                        (cats.categories || []).map((c) => [c._id, c.categoryName])
                    )
                );
            } catch (error) {
                console.error("Error fetching posts:", error);
                setPosts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [categoryId]);

    const needle = query.trim().toLowerCase();
    const allPosts = posts?.posts || [];
    const visiblePosts = needle
        ? allPosts.filter((p) =>
              [p.title, p.content, categoryNames[p.category]]
                  .filter(Boolean)
                  .some((t) => t.toLowerCase().includes(needle))
          )
        : allPosts;

    return (
        <Container
            sx={{
                mt: { xs: 2, sm: 5 },
            }}
        >
            {categoryId && (
                <Box sx={{ mb: 3 }}>
                    <Link component={RouterLink} to="/categories" variant="body2">
                        &larr; All categories
                    </Link>
                    <Typography variant="h4" component="h1" sx={{ mt: 1 }}>
                        {category?.categoryName || "Category"}
                    </Typography>
                    {category?.categoryDescription && (
                        <Typography color="text.secondary">
                            {category.categoryDescription}
                        </Typography>
                    )}
                </Box>
            )}
            <Box sx={{ mb: 3 }}>
                <SearchField
                    value={query}
                    onChange={setQuery}
                    placeholder={categoryId ? "Search posts in this category" : "Search posts"}
                />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                <Grid
                    container
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    {visiblePosts.length > 0 ? (
                        visiblePosts.map((post) => (
                            <Grid
                                size={{ xs: 12, sm: 6, md: 4 }}
                                key={post._id}
                                display="flex"
                                justifyContent="center"
                            >
                                <PostCard
                                    title={post.title}
                                    content={post.content}
                                    categoryName={categoryNames[post.category]}
                                    createdAt={post.createdAt}
                                    postId={post._id}
                                />
                            </Grid>
                        ))  
                    ) : loading ? (
                        <CircularProgress />
                    ) : (
                        <Typography color="text.secondary">
                            {needle ? "No posts match your search" : "No posts available"}
                        </Typography>
                    )}
                </Grid>
            </Box>
        </Container>
    );
}

export default GetAllPosts;
