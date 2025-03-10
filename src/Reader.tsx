import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';

interface ReaderProps {
  content: string;
  filePath?: string;
}

const Reader: React.FC<ReaderProps> = ({ content, filePath }) => {
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!content) {
      setRenderedContent('');
      return;
    }

    const renderMarkdown = async () => {
      setLoading(true);
      try {
        const response = await axios.post('/api/render/markdown', {
          content,
          filePath,
          renderOptions: {
            includeDataViews: true,
            resolveLinks: true
          }
        });

        setRenderedContent(response.data.html);
        setError(null);
      } catch (err) {
        console.error('Error rendering markdown:', err);
        setError('Failed to render content');
      } finally {
        setLoading(false);
      }
    };

    renderMarkdown();
  }, [content, filePath]);

  if (loading) {
    return <div className="text-gray-500">Rendering...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  // Sanitize HTML before rendering
  const sanitizedHtml = DOMPurify.sanitize(renderedContent);

  return (
    <div
      className="markdown-preview prose max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default Reader;