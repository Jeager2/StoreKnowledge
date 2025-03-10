import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
export interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: string;
  type: string;
}

export interface FileContent {
  content: string;
  path: string;
  modified: string;
}

export interface CreateFileParams {
  path: string;
  content: string;
  isDir: boolean;
}

export interface MoveFileParams {
  sourcePath: string;
  destinationPath: string;
}

export interface RenameFileParams {
  path: string;
  newName: string;
}

// File System Service
const fileService = {
  // List directory contents
  listDirectory: async (path: string): Promise<FileItem[]> => {
    const response = await axios.get(`${API_URL}/files/list`, {
      params: { path }
    });
    return response.data;
  },

  // Get file content
  getFileContent: async (path: string): Promise<FileContent> => {
    const response = await axios.get(`${API_URL}/files/content`, {
      params: { path }
    });
    return response.data;
  },

  // Create a new file or directory
  createFile: async ({ path, content, isDir }: CreateFileParams): Promise<FileItem> => {
    const response = await axios.post(`${API_URL}/files/create`, {
      path,
      content,
      is_dir: isDir
    });
    return response.data;
  },

  // Update file content
  updateFile: async (path: string, content: string): Promise<void> => {
    await axios.put(`${API_URL}/files/update`, {
      path,
      content
    });
  },

  // Delete a file or directory
  deleteFile: async (path: string): Promise<void> => {
    await axios.delete(`${API_URL}/files/delete`, {
      params: { path }
    });
  },

  // Move a file or directory
  moveFile: async ({ sourcePath, destinationPath }: MoveFileParams): Promise<void> => {
    await axios.post(`${API_URL}/files/move`, {
      source_path: sourcePath,
      destination_path: destinationPath
    });
  },

  // Rename a file or directory
  renameFile: async ({ path, newName }: RenameFileParams): Promise<void> => {
    await axios.post(`${API_URL}/files/rename`, {
      path,
      new_name: newName
    });
  },

  // Upload a file
  uploadFile: async (path: string, file: File): Promise<FileItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await axios.post(`${API_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  // Search files
  searchFiles: async (query: string, path?: string): Promise<FileItem[]> => {
    const response = await axios.get(`${API_URL}/search`, {
      params: {
        query,
        path
      }
    });
    return response.data;
  },

  // Get file statistics for dashboard
  getFileStats: async (): Promise<any> => {
    const response = await axios.get(`${API_URL}/files/stats`);
    return response.data;
  }
};

export default fileService;