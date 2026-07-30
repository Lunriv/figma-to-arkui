import copy from "copy-to-clipboard";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export const CopyButton = ({ value }: { value: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyCode = (): void => {
    copy(value);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <button
      type="button"
      className="icon-button"
      onClick={copyCode}
      aria-label={isCopied ? "Copied" : "Copy code"}
      title={isCopied ? "Copied" : "Copy code"}
    >
      {isCopied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
};
