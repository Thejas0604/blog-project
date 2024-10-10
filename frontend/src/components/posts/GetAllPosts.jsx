import React from "react";
import PostCard from "./postCard";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Container from "@mui/material/Container";
import { useState, useEffect } from "react";
import { getAllPosts } from "../../services/postsAPI";

function GetAllPosts() {
    const [posts, setPosts] = useState([]);
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const fetchedPosts = await getAllPosts();
                setPosts(fetchedPosts);
                //console.log(fetchedPosts);
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
                                    image={post.postImage.path}
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
