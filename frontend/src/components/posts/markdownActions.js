// Pure text transforms for the Markdown toolbar.
// Each takes (value, start, end) and returns { value, start, end } where
// start/end is the selection to restore afterwards.

const splice = (value, start, end, text) => value.slice(0, start) + text + value.slice(end);

// Wrap the selection in before/after. With no selection, insert the
// placeholder between the markers and select it.
export const wrapSelection = (value, start, end, before, after = before, placeholder = "text") => {
    if (start === end) {
        const next = splice(value, start, end, before + placeholder + after);
        return { value: next, start: start + before.length, end: start + before.length + placeholder.length };
    }
    const selected = value.slice(start, end);
    const next = splice(value, start, end, before + selected + after);
    return { value: next, start: start + before.length, end: start + before.length + selected.length };
};

// Apply a prefix to every line touched by the selection. prefix is a string or (index) => string.
export const prefixLines = (value, start, end, prefix) => {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    // A selection ending right after a newline does not include the next line.
    const effEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
    let lineEnd = value.indexOf("\n", effEnd);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const out = block
        .split("\n")
        .map((line, i) => (typeof prefix === "function" ? prefix(i) : prefix) + line)
        .join("\n");
    return { value: splice(value, lineStart, lineEnd, out), start: lineStart, end: lineStart + out.length };
};

export const bold = (v, s, e) => wrapSelection(v, s, e, "**", "**", "bold text");
export const italic = (v, s, e) => wrapSelection(v, s, e, "*", "*", "italic text");
export const inlineCode = (v, s, e) => wrapSelection(v, s, e, "`", "`", "code");
export const heading = (v, s, e) => prefixLines(v, s, e, "## ");
export const bulletList = (v, s, e) => prefixLines(v, s, e, "- ");
export const numberedList = (v, s, e) => prefixLines(v, s, e, (i) => `${i + 1}. `);
export const quote = (v, s, e) => prefixLines(v, s, e, "> ");

export const codeBlock = (v, s, e) => {
    const needsLead = s > 0 && v[s - 1] !== "\n";
    const needsTrail = e < v.length && v[e] !== "\n";
    const before = (needsLead ? "\n" : "") + "```\n";
    const after = "\n```" + (needsTrail ? "\n" : "");
    return wrapSelection(v, s, e, before, after, "code");
};

// [selection](url) with "url" selected; with no selection, "link text" is the label.
export const link = (v, s, e) => {
    const label = s === e ? "link text" : v.slice(s, e);
    const text = `[${label}](url)`;
    const urlStart = s + label.length + 3;
    return { value: splice(v, s, e, text), start: urlStart, end: urlStart + 3 };
};

// Insert text at the caret (replacing any selection); caret ends after it.
export const insertAt = (value, start, end, text) => ({
    value: splice(value, start, end, text),
    start: start + text.length,
    end: start + text.length,
});

// Keep the alt text from breaking Markdown syntax.
export const safeAlt = (name = "") =>
    name.replace(/\.[^.]*$/, "").replace(/[[\]()\\\n\r]/g, " ").replace(/\s+/g, " ").trim() || "image";

export const uploadingToken = (name) => `![Uploading ${safeAlt(name)}...]()`;

// Replace the first occurrence of token; returns the original value if absent.
export const replaceToken = (value, token, replacement) => {
    const i = value.indexOf(token);
    if (i === -1) return value;
    return value.slice(0, i) + replacement + value.slice(i + token.length);
};
