import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPostById } from "../../services/postsAPI";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import Container from "@mui/material/Container";
import { CircularProgress } from "@mui/material";

export const PostDetails = () => {
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const [error, setError] = useState(null);

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
                <CardActions>
                    <Button size="small" color="primary">
                        Share
                    </Button>
                </CardActions>
            </Card>
        </Container>
    );
};
