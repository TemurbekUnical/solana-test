import { useEffect, useState } from "react";

const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.error("Copy to clipboard failed:", error);
    }
  };

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 3000); // Reset copied state after 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  return { copied, copyToClipboard };
};
export default useCopyToClipboard;
