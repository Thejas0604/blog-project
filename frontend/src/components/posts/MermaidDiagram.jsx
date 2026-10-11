import { useEffect, useId, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { hasMermaidConfig } from "./mermaidUtils";

const RENDER_DELAY_MS = 400;

const Fallback = ({ code, error, blocked }) => (
    <>
        <pre>
            <code>{code}</code>
        </pre>
        {error && (
            <Typography variant="caption" color="text.secondary">
                Diagram could not be rendered.
            </Typography>
        )}
        {blocked && (
            <Typography variant="caption" color="text.secondary">
                Diagram directives and frontmatter are not allowed.
            </Typography>
        )}
    </>
);

// mermaid creates temporary elements "d<id>" and "i<id>" in <body> while rendering.
const removeTempElements = (id) => {
    document.getElementById(`d${id}`)?.remove();
    document.getElementById(`i${id}`)?.remove();
};

// Renders a Mermaid diagram. mermaid is loaded lazily so other pages never fetch it.
const MermaidDiagram = ({ code }) => {
    const themeMode = useTheme().palette.mode;
    const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
    const counter = useRef(0);
    const holder = useRef(null);
    const [state, setState] = useState("loading"); // loading | done | error
    const blocked = hasMermaidConfig(code);

    useEffect(() => {
        if (blocked) return undefined;
        let stale = false;
        let currentId = null;
        setState("loading");
        const timer = setTimeout(async () => {
            const id = `mmd-${reactId}-${counter.current++}`;
            currentId = id;
            try {
                const { default: mermaid } = await import("mermaid");
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: "strict",
                    theme: themeMode === "dark" ? "dark" : "default",
                    themeCSS: "",
                    htmlLabels: false,
                    flowchart: { htmlLabels: false },
                });
                const { svg } = await mermaid.render(id, code);
                if (stale) return;
                // securityLevel "strict" makes Mermaid sanitize the SVG (DOMPurify), so innerHTML is acceptable.
                if (holder.current) holder.current.innerHTML = svg;
                setState("done");
            } catch {
                // mermaid leaves temporary elements in <body> on failure; remove them.
                removeTempElements(id);
                if (stale) return;
                setState("error");
            } finally {
                removeTempElements(id);
            }
        }, RENDER_DELAY_MS);
        return () => {
            stale = true;
            clearTimeout(timer);
            if (currentId) removeTempElements(currentId);
        };
    }, [code, themeMode, reactId, blocked]);

    if (blocked) return <Fallback code={code} blocked />;

    return (
        <>
            <Box
                ref={holder}
                role="img"
                aria-label="Mermaid diagram"
                sx={{
                    display: state === "done" ? "block" : "none",
                    overflowX: "auto",
                    my: 2,
                    textAlign: "center",
                    "& svg": { maxWidth: "100%", height: "auto" },
                }}
            />
            {state !== "done" && <Fallback code={code} error={state === "error"} />}
        </>
    );
};

export default MermaidDiagram;
