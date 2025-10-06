import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  // Handle edge cases
  if (!content) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="break-words"
      components={{
        // Customize heading elements
        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-3 mb-1 break-words" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-1 break-words" {...props} />,
        h3: ({ node, ...props }) => <h3 className="font-bold mt-2 mb-1 break-words" {...props} />,
        // Customize paragraphs
        p: ({ node, ...props }) => <p className="mb-2 break-words" {...props} />,
        // Customize code blocks
        code: ({ node, inline, ...props }) => 
          inline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-words" {...props} />
          ) : (
            <code className="bg-muted p-3 rounded text-sm font-mono block overflow-x-auto break-words" {...props} />
          ),
        // Customize blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote className="border-l-2 border-muted-foreground pl-4 ml-2 text-muted-foreground break-words" {...props} />
        ),
        // Customize lists
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 break-words" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 break-words" {...props} />,
        // Handle links
        a: ({ node, ...props }) => <a className="text-primary hover:underline break-words" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};