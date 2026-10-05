import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import { useNavigate } from "react-router-dom";

// Rough plain-text excerpt: drop common Markdown punctuation and cap the length.
const makeExcerpt = (markdown = "", max = 160) => {
    const text = markdown
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text.length > max ? text.slice(0, max).trimEnd() + "..." : text;
};

export default function PostCard(props) {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate(`/posts/${props.postId}`);
    };
    const date = props.createdAt
        ? new Date(props.createdAt).toLocaleDateString()
        : "";
    return (
        <Card sx={{ width: "100%", maxWidth: 345, mb: "10px", borderRadius: "10px" }}>
            <CardActionArea onClick={handleClick}>
                <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                        {props.title}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", display: "block", mb: 1 }}
                    >
                        {[props.categoryName, date].filter(Boolean).join(" | ")}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {makeExcerpt(props.content)}
                    </Typography>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={handleClick}>
                    See More
                </Button>
            </CardActions>
        </Card>
    );
}
