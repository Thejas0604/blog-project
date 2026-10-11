import React from "react";
import { Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";
import { isMermaidClass, childrenToText } from "./mermaidUtils";

// No rehype-raw: raw HTML in Markdown is never rendered.
const components = {
    // eslint-disable-next-line no-unused-vars
    img: ({ node, alt, ...props }) => (
        <img
            {...props}
            alt={alt || ""}
            loading="lazy"
            style={{ maxWidth: "100%", height: "auto" }}
        />
    ),
    // Wrap tables so wide ones scroll horizontally instead of overflowing.
    // eslint-disable-next-line no-unused-vars
    table: ({ node, ...props }) => (
        <div className="table-scroll">
            <table {...props} />
        </div>
    ),
    // Only ```mermaid fences become diagrams; every other block renders as before.
    // eslint-disable-next-line no-unused-vars
    pre: ({ node, children, ...props }) => {
        const code = React.Children.toArray(children)[0];
        if (React.isValidElement(code) && isMermaidClass(code.props.className)) {
            return <MermaidDiagram code={childrenToText(code.props.children)} />;
        }
        return <pre {...props}>{children}</pre>;
    },
    // GFM task-list checkboxes are read-only.
    // eslint-disable-next-line no-unused-vars
    input: ({ node, ...props }) => <input {...props} disabled readOnly />,
};

const PostContent = ({ content }) => (
    <Box
        sx={{
            overflowWrap: "anywhere",
            "& img": { maxWidth: "100%", height: "auto" },
            "& pre": { overflowX: "auto" },
            "& .table-scroll": { overflowX: "auto", my: 2 },
            "& table": { borderCollapse: "collapse", width: "max-content", minWidth: "50%" },
            "& th, & td": {
                border: 1,
                borderColor: "divider",
                px: 1.5,
                py: 0.75,
                textAlign: "left",
            },
            "& th": { fontWeight: 700 },
            "& del": { opacity: 0.7 },
            "& ul.contains-task-list": { listStyle: "none", pl: 0 },
            "& li.task-list-item input": { mr: 1 },
        }}
    >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content || ""}
        </ReactMarkdown>
    </Box>
);

export default PostContent;
