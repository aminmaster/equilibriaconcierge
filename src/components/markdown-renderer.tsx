import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  // Handle edge cases
  if (!content) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
      components={{
        // Customize heading elements
        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-3 mb-1" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-1" {...props} />,
        h3: ({ node, ...props }) => <h3 className="font-bold mt-2 mb-1" {...props} />,
        // Customize code blocks
        code: ({ node, inline, ...props }) => 
          inline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
          ) : (
            <code className="bg-muted p-3 rounded text-sm font-mono block overflow-x-auto" {...props} />
          ),
        // Customize blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote className="border-l-2 border-muted-foreground pl-4 ml-2 text-muted-foreground" {...props} />
        ),
        // Customize lists
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};