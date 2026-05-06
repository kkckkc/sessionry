import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import './markdown-preview.css';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * MarkdownPreview component renders markdown content with GitHub Flavored Markdown support.
 * Includes syntax highlighting for code blocks and proper styling.
 */
export const MarkdownPreview = ({ content, className = '' }: MarkdownPreviewProps) => {
  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
