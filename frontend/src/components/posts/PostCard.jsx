import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";

export default function PostCard(props) {
    const handleClick = () => {
        //example thing
        window.location.href = "https://www.youtube.com/watch?v=xvFZjo5PgG0&pp=ygUJcmljayByb2xs";
    };
    return (
        <Card sx={{ maxWidth: 345, mb: "10px", borderRadius:"10px" }}>
            <CardActionArea>
                <CardMedia
                    component="img"
                    height="140"
                    image={props.image}
                    alt="image description"
                />
                <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                        {props.title}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            color: "text.secondary",
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {props.content}
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
