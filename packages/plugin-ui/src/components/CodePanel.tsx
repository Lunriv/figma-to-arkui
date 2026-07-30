import { useMemo, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import coldarkDark from "react-syntax-highlighter/dist/esm/styles/prism/coldark-dark";
import { CopyButton } from "./CopyButton";

const COLLAPSED_LINES = 30;
SyntaxHighlighter.registerLanguage("typescript", typescript);

export const CodePanel = ({ code }: { code: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = useMemo(() => code.split("\n"), [code]);
  const canExpand = lines.length > COLLAPSED_LINES;
  const displayedCode =
    canExpand && !isExpanded
      ? `${lines.slice(0, COLLAPSED_LINES).join("\n")}\n...`
      : code;

  return (
    <section className="code-panel">
      <header>
        <h1>ArkUI</h1>
        <CopyButton value={code} />
      </header>
      <SyntaxHighlighter
        language="typescript"
        style={coldarkDark}
        customStyle={{
          fontSize: 12,
          margin: 0,
          borderRadius: 0,
          minHeight: "100%",
        }}
      >
        {displayedCode}
      </SyntaxHighlighter>
      {canExpand && (
        <button
          type="button"
          className="expand-button"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
};
