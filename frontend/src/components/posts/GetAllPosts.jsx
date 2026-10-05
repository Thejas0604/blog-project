import React from "react";
import PostCard from "./PostCard";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Container from "@mui/material/Container";
import { useState, useEffect } from "react";
import { getAllPosts } from "../../services/postsAPI";
import { getAllCategories } from "../../services/categoryAPI";

function GetAllPosts() {
    const [posts, setPosts] = useState([]);
    const [categoryNames, setCategoryNames] = useState({});
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const fetchedPosts = await getAllPosts();
                setPosts(fetchedPosts);
                const cats = await getAllCategories();
                setCategoryNames(
                    Object.fromEntries(
                        (cats.categories || []).map((c) => [c._id, c.categoryName])
                    )
                );
            } catch (error) {
                console.error("Error fetching posts:", error);
            }
        };
        fetchPosts();
    }, []);

    return (
        <Container
            sx={{
                mt: 5,
            }}
        >
            <Box sx={{ flexGrow: 1 }}>
                <Grid
                    container
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    {posts?.posts?.length > 0 ? (
                        posts.posts.map((post) => (
                            <Grid
                                size={4}
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
                    ) : (
                        <p>No posts available</p>
                    )}
                </Grid>
            </Box>
        </Container>
    );
}

export default GetAllPosts;
