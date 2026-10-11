import test from "node:test";
import assert from "node:assert/strict";
import { getCodeLanguage, isMermaidClass, childrenToText, hasMermaidConfig } from "./mermaidUtils.js";

test("getCodeLanguage", () => {
    assert.equal(getCodeLanguage("language-mermaid"), "mermaid");
    assert.equal(getCodeLanguage("foo language-js"), "js");
    assert.equal(getCodeLanguage(undefined), null);
    assert.equal(getCodeLanguage("notlanguage-x"), null);
});

test("isMermaidClass", () => {
    assert.equal(isMermaidClass("language-mermaid"), true);
    assert.equal(isMermaidClass("language-mermaidx"), false);
    assert.equal(isMermaidClass("language-js"), false);
});

test("childrenToText", () => {
    assert.equal(childrenToText("graph TD\nA-->B\n"), "graph TD\nA-->B");
    assert.equal(childrenToText(["a", "b\n"]), "ab");
    assert.equal(childrenToText(undefined), "");
});

test("hasMermaidConfig rejects directives and frontmatter", () => {
    assert.equal(hasMermaidConfig('%%{init: {"themeCSS": "body{}"}}%%\ngraph TD\nA-->B'), true);
    assert.equal(hasMermaidConfig("graph TD\nA-->B\n%%{init: {}}%%"), true);
    assert.equal(hasMermaidConfig("graph TD\n%% {init: {}}%%"), true);
    assert.equal(hasMermaidConfig("graph TD\n%%{INIT: {}}%%"), true);
    assert.equal(hasMermaidConfig("graph TD\n%%\t{ init: {} }%%"), true);
    assert.equal(hasMermaidConfig("---\nconfig:\n  themeCSS: x\n---\ngraph TD\nA-->B"), true);
    assert.equal(hasMermaidConfig("\n  \n  ---\r\nconfig: {}\n---\ngraph TD"), true);
});

test("hasMermaidConfig allows normal diagrams", () => {
    assert.equal(hasMermaidConfig("graph TD\nA-->B"), false);
    assert.equal(hasMermaidConfig("sequenceDiagram\nAlice->>Bob: Hi"), false);
    assert.equal(hasMermaidConfig("erDiagram\nA ||--o{ B : has"), false);
    assert.equal(hasMermaidConfig("graph TD\nA --- B"), false);
    assert.equal(hasMermaidConfig("graph TD\n---\nA --- B"), false);
    assert.equal(hasMermaidConfig("%% just a comment\ngraph TD\nA-->B"), false);
    assert.equal(hasMermaidConfig(""), false);
    assert.equal(hasMermaidConfig(undefined), false);
});
