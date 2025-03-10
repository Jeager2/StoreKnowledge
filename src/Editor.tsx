import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';
import MonacoEditor from 'react-monaco-editor';
import Reader from './Reader';
import DataView from './DataView';
import KanbanBoard from './KanbanBoard';

interface EditorProps {
  filePath: string;
  onSave?: (content: string) => void;
}

type ViewMode = 'edit' | 'preview' | 'split' | 'dataview' | 'kanban';

const Editor: React.FC<EditorProps> = ({ filePath, onSave }) => {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedContent = useDebounce(content, 1000);

  // Load file content
  useEffect(() => {
    if (!filePath) return;

    const fetchContent = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/files/content?path=${encodeURIComponent(filePath)}`);
        setContent(response.data.content);
        setOriginalContent(response.data.content);
        setError(null);
      } catch (err) {
        console.error('Error loading file:', err);
        setError('Failed to load file content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [filePath]);

  // Auto-save on content change
  useEffect(() => {
    if (debouncedContent && debouncedContent !== originalContent) {
      saveContent(debouncedContent);
    }
  }, [debouncedContent, originalContent]);

  const saveContent = async (contentToSave: string) => {
    if (!filePath || saving) return;

    setSaving(true);
    try {
      await axios.post('/api/files/save', {
        path: filePath,
        content: contentToSave
      });

      setOriginalContent(contentToSave);
      if (onSave) onSave(contentToSave);
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value: string) => {
    setContent(value);
  };

  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    lineNumbers: 'on',
    lineHeight: 22,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 14,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="text-sm text-gray-500">{filePath}</div>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === 'edit' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('edit')}
          >
            Edit
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === 'split' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === 'dataview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('dataview')}
          >
            Data View
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === 'kanban' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </button>
        </div>
        <div className="text-sm">
          {saving ? 'Saving...' : 'Saved'}
        </div>
      </div>

      <div className="flex-grow relative overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`absolute top-0 left-0 ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            } h-full`}
          >
            <MonacoEditor
              language="markdown"
              theme="vs-light"
              value={content}
              options={editorOptions}
              onChange={handleEditorChange}
              className="h-full"
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`absolute top-0 ${
              viewMode === 'split' ? 'left-1/2 w-1/2' : 'left-0 w-full'
            } h-full overflow-auto px-4 py-2`}
          >
            <Reader content={content} />
          </div>
        )}

        {viewMode === 'dataview' && (
          <div className="absolute top-0 left-0 w-full h-full overflow-auto p-4">
            <DataView filePath={filePath} content={content} />
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="absolute top-0 left-0 w-full h-full overflow-auto p-4">
            <KanbanBoard filePath={filePath} content={content} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;