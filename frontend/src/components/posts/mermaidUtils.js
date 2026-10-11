// Returns the fenced-code language from a react-markdown className ("language-xyz"), or null.
export const getCodeLanguage = (className) => {
    const match = /(?:^|\s)language-([^\s]+)/.exec(className || "");
    return match ? match[1] : null;
};

export const isMermaidClass = (className) => getCodeLanguage(className) === "mermaid";

// Flattens react-markdown code children (string or array of strings) to text.
export const childrenToText = (children) =>
    [].concat(children ?? []).join("").replace(/\n$/, "");

// True when the source carries Mermaid config: a %%{ ... }%% directive anywhere,
// or a leading --- frontmatter fence. Such sources are never handed to mermaid.
export const hasMermaidConfig = (code) => {
    const text = String(code ?? "");
    return /%%\s*\{/.test(text) || /^\s*---[ \t]*(\r?\n|$)/.test(text);
};
