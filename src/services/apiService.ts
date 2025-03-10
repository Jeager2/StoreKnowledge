/**
 * API Service for handling all backend API calls
 */
import { AuthResponse, UserData } from '../types/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Generic request handler
const request = async <T>(
  endpoint: string,
  method: string = 'GET',
  data?: any,
  customHeaders?: Record<string, string>
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    ...getAuthHeaders(),
    ...customHeaders,
  };

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses (like file downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || 'An error occurred');
      }

      return responseData as T;
    } else {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'An error occurred');
      }

      return response as any as T;
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', 'POST', { username, password }),

  logout: () =>
    request<void>('/api/auth/logout', 'POST'),

  getCurrentUser: () =>
    request<UserData>('/api/auth/me'),

  register: (username: string, password: string, email: string) =>
    request<AuthResponse>('/api/auth/register', 'POST', { username, password, email }),
};

// File System API
export const fileSystemAPI = {
  listDirectory: (path: string) =>
    request<any>(`/api/files/list?path=${encodeURIComponent(path)}`),

  getFileContent: (path: string) =>
    request<any>(`/api/files/content?path=${encodeURIComponent(path)}`),

  createFile: (path: string, content: string) =>
    request<any>('/api/files/create', 'POST', { path, content }),

  updateFile: (path: string, content: string) =>
    request<any>('/api/files/update', 'POST', { path, content }),

  deleteFile: (path: string) =>
    request<any>('/api/files/delete', 'POST', { path }),

  createFolder: (path: string) =>
    request<any>('/api/files/create-folder', 'POST', { path }),

  moveFile: (oldPath: string, newPath: string) =>
    request<any>('/api/files/move', 'POST', { old_path: oldPath, new_path: newPath }),

  uploadFile: (path: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    return request<any>(
      '/api/files/upload',
      'POST',
      formData,
      { 'Content-Type': 'multipart/form-data' }
    );
  }
};

// Search API
export const searchAPI = {
  searchFiles: (query: string) =>
    request<any>(`/api/search?q=${encodeURIComponent(query)}`),
};

// Markdown API
export const markdownAPI = {
  renderMarkdown: (content: string) =>
    request<any>('/api/markdown/render', 'POST', { content }),

  exportToPdf: (path: string) =>
    request<Blob>(`/api/pdf/export?path=${encodeURIComponent(path)}`, 'GET', undefined, {
      Accept: 'application/pdf',
    }),
};

// DataView API
export const dataViewAPI = {
  executeQuery: (query: string) =>
    request<any>('/api/dataview/query', 'POST', { query }),
};

// Kanban API
export const kanbanAPI = {
  getKanbanData: (path: string) =>
    request<any>(`/api/kanban/data?path=${encodeURIComponent(path)}`),

  updateKanbanData: (path: string, data: any) =>
    request<any>('/api/kanban/update', 'POST', { path, data }),
};

export default {
  auth: authAPI,
  fileSystem: fileSystemAPI,
  search: searchAPI,
  markdown: markdownAPI,
  dataView: dataViewAPI,
  kanban: kanbanAPI,
};