import React, { useRef, useState, useEffect, useCallback } from "react";
import {
    Alert,
    Box,
    IconButton,
    Paper,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import TitleIcon from "@mui/icons-material/Title";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import CodeIcon from "@mui/icons-material/Code";
import DataObjectIcon from "@mui/icons-material/DataObject";
import LinkIcon from "@mui/icons-material/Link";
import ImageIcon from "@mui/icons-material/Image";
import PostContent from "./PostContent";
import { uploadImage, ALLOWED_IMAGE_TYPES } from "../../services/uploadsAPI";
import * as actions from "./markdownActions";

const TOOLS = [
    { key: "bold", label: "Bold", icon: <FormatBoldIcon fontSize="small" />, run: actions.bold },
    { key: "italic", label: "Italic", icon: <FormatItalicIcon fontSize="small" />, run: actions.italic },
    { key: "heading", label: "Heading", icon: <TitleIcon fontSize="small" />, run: actions.heading },
    { key: "ul", label: "Bullet list", icon: <FormatListBulletedIcon fontSize="small" />, run: actions.bulletList },
    { key: "ol", label: "Numbered list", icon: <FormatListNumberedIcon fontSize="small" />, run: actions.numberedList },
    { key: "quote", label: "Quote", icon: <FormatQuoteIcon fontSize="small" />, run: actions.quote },
    { key: "code", label: "Inline code", icon: <CodeIcon fontSize="small" />, run: actions.inlineCode },
    { key: "block", label: "Code block", icon: <DataObjectIcon fontSize="small" />, run: actions.codeBlock },
    { key: "link", label: "Link", icon: <LinkIcon fontSize="small" />, run: actions.link },
];

const MarkdownEditor = ({ value, onChange, onBusyChange, disabled = false }) => {
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md"));
    const [mode, setMode] = useState("write");
    const [pending, setPending] = useState(0);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);
    const fileRef = useRef(null);
    // Latest value, so async upload completions never overwrite newer typing.
    const valueRef = useRef(value);
    valueRef.current = value;

    useEffect(() => {
        if (onBusyChange) onBusyChange(pending > 0);
    }, [pending, onBusyChange]);

    const commit = useCallback(
        (result, restore = true) => {
            valueRef.current = result.value;
            onChange(result.value);
            if (restore) {
                // Wait for React to apply the controlled value, then restore focus and selection.
                requestAnimationFrame(() => {
                    const el = inputRef.current;
                    if (!el) return;
                    el.focus();
                    el.setSelectionRange(result.start, result.end);
                });
            }
        },
        [onChange]
    );

    const getSelection = () => {
        const el = inputRef.current;
        const len = valueRef.current.length;
        if (!el) return [len, len];
        return [el.selectionStart ?? len, el.selectionEnd ?? len];
    };

    const applyTool = (run) => {
        const [s, e] = getSelection();
        commit(run(valueRef.current, s, e));
    };

    const uploadFiles = async (files) => {
        setError("");
        for (const file of files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                setError("Only PNG, JPEG, GIF and WebP images can be uploaded");
                continue;
            }
            const name = file.name || "pasted image";
            const token = actions.uploadingToken(name);
            const [s, e] = getSelection();
            const cur = valueRef.current;
            const prefix = s > 0 && cur[s - 1] !== "\n" ? "\n" : "";
            commit(actions.insertAt(cur, s, e, prefix + token + "\n"));
            setPending((n) => n + 1);
            try {
                const res = await uploadImage(file);
                const md = `![${actions.safeAlt(name)}](${res.url})`;
                commit({ value: actions.replaceToken(valueRef.current, token, md) }, false);
            } catch (err) {
                commit({ value: actions.replaceToken(valueRef.current, token + "\n", "") }, false);
                if (valueRef.current.includes(token)) {
                    commit({ value: actions.replaceToken(valueRef.current, token, "") }, false);
                }
                setError(err.response?.data?.message || err.message || "Image upload failed");
            } finally {
                setPending((n) => n - 1);
            }
        }
    };

    const imageFiles = (list) => Array.from(list || []).filter((f) => f.type.startsWith("image/"));

    const handlePaste = (ev) => {
        const files = imageFiles(ev.clipboardData?.files);
        if (files.length) {
            ev.preventDefault();
            uploadFiles(files);
        }
    };

    const handleDrop = (ev) => {
        setDragging(false);
        const files = imageFiles(ev.dataTransfer?.files);
        if (files.length) {
            ev.preventDefault();
            uploadFiles(files);
        }
    };

    const handleDragOver = (ev) => {
        if (Array.from(ev.dataTransfer?.types || []).includes("Files")) {
            ev.preventDefault();
            setDragging(true);
        }
    };

    const showWrite = wide || mode === "write";
    const showPreview = wide || mode === "preview";

    return (
        <Box sx={{ mt: 2, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                    Content (Markdown) *
                </Typography>
                {showWrite &&
                    TOOLS.map((t) => (
                        <Tooltip key={t.key} title={t.label}>
                            <span>
                                <IconButton
                                    size="small"
                                    aria-label={t.label}
                                    disabled={disabled}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applyTool(t.run)}
                                >
                                    {t.icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ))}
                {showWrite && (
                    <Tooltip title="Insert image">
                        <span>
                            <IconButton
                                size="small"
                                aria-label="Insert image"
                                disabled={disabled}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => fileRef.current?.click()}
                            >
                                <ImageIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    hidden
                    multiple
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        if (files.length) uploadFiles(files);
                    }}
                />
                {!wide && (
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={mode}
                        onChange={(_, v) => v && setMode(v)}
                        sx={{ ml: "auto" }}
                    >
                        <ToggleButton value="write">Write</ToggleButton>
                        <ToggleButton value="preview">Preview</ToggleButton>
                    </ToggleButtonGroup>
                )}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>
                    {error}
                </Alert>
            )}
            {pending > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Uploading image...
                </Typography>
            )}

            <Box sx={{ display: "flex", flexDirection: wide ? "row" : "column", gap: 2 }}>
                {showWrite && (
                    <TextField
                        name="content"
                        multiline
                        minRows={10}
                        maxRows={30}
                        fullWidth
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        inputRef={inputRef}
                        disabled={disabled}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={() => setDragging(false)}
                        placeholder="Write Markdown. Paste or drop an image to upload it."
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            "& .MuiOutlinedInput-root": dragging
                                ? { outline: `2px dashed ${theme.palette.primary.main}` }
                                : {},
                        }}
                    />
                )}
                {showPreview && (
                    <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 2, minHeight: 240, overflow: "auto" }}>
                        {value ? (
                            <PostContent content={value} />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Nothing to preview
                            </Typography>
                        )}
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default MarkdownEditor;
