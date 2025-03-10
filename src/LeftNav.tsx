import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFolder, FaFolderOpen, FaFile, FaChevronRight, FaChevronDown, FaPlus, FaEllipsisV } from 'react-icons/fa';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface LeftNavProps {
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const LeftNav: React.FC<LeftNavProps> = ({ onFileSelect, selectedFile, isCollapsed, toggleCollapse }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string } | null>(null);

  useEffect(() => {
    fetchFileTree();
  }, []);

  const fetchFileTree = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/files/tree');
      setFileTree(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching file tree:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileClick = (path: string) => {
    onFileSelect(path);
  };

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  };

  const handleCreateFile = async (parentPath: string) => {
    const fileName = prompt('Enter file name (with .md extension):');
    if (!fileName) return;

    try {
      await axios.post('/api/files/create', {
        path: parentPath === '/' ? `/${fileName}` : `${parentPath}/${fileName}`,
        type: 'file',
        content: '# New File'
      });
      fetchFileTree();
    } catch (err) {
      console.error('Error creating file:', err);
      alert('Failed to create file');
    }
  };

  const handleCreateFolder = async (parentPath: string) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      await axios.post('/api/files/create', {
        path: parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`,
        type: 'folder'
      });
      fetchFileTree();
    } catch (err) {
      console.error('Error creating folder:', err);
      alert('Failed to create folder');
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const isSelected = node.path === selectedFile;
      const indentation = level * 12;

      return (
        <div key={node.path}>
          <div
            className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
            style={{ paddingLeft: `${indentation}px` }}
            onClick={() => node.type === 'folder' ? toggleFolder(node.path) : handleFileClick(node.path)}
            onContextMenu={(e) => handleContextMenu(e, node.path)}
          >
            <div className="mr-1">
              {node.type === 'folder' && (
                isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />
              )}
            </div>
            <div className="mr-2">
              {node.type === 'folder' ? (
                isExpanded ? <FaFolderOpen className="text-yellow-500" /> : <FaFolder className="text-yellow-500" />
              ) : (
                <FaFile className="text-gray-500" />
              )}
            </div>
            <div className="truncate text-sm">
              {node.name}
            </div>
          </div>

          {node.type === 'folder' && isExpanded && node.children && (
            <div>
              {renderFileTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (isCollapsed) {
    return (
      <div className="h-full w-10 bg-gray-100 border-r flex flex-col items-center py-2">
        <button
          onClick={toggleCollapse}
          className="p-2 hover:bg-gray-200 rounded"
        >
          <FaChevronRight />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-64 bg-gray-50 border-r flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-medium">Files</h2>
        <div className="flex">
          <button
            onClick={() => handleCreateFile('/')}
            className="p-1 hover:bg-gray-200 rounded mr-1"
            title="New File"
          >
            <FaPlus size={14} />
          </button>
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-gray-200 rounded"
            title="Collapse"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-grow">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : (
          renderFileTree(fileTree)
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white shadow-lg rounded z-50 py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => {
              if (contextMenu) {
                handleCreateFile(contextMenu.path);
                setContextMenu(null);
              }
            }}
          >
            New File
          </div>
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => {
              if (contextMenu) {
                handleCreateFolder(contextMenu.path);
                setContextMenu(null);
              }
            }}
          >
            New Folder
          </div>
          <div className="border-t my-1"></div>
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600"
            onClick={() => setContextMenu(null)}
          >
            Close
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftNav;