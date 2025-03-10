import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';

interface AppContextProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLeftNavCollapsed: boolean;
  toggleLeftNav: () => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  breadcrumbs: string[];
  refreshFiles: () => Promise<void>;
  fileTree: FileNode[];
  isLoading: boolean;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('leftNavCollapsed');
    return saved === 'true';
  });

  const [currentPath, setCurrentPath] = useState<string>('');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleLeftNav = () => {
    setIsLeftNavCollapsed(!isLeftNavCollapsed);
    localStorage.setItem('leftNavCollapsed', String(!isLeftNavCollapsed));
  };

  const getBreadcrumbs = (path: string): string[] => {
    if (!path) return [];
    return ['Home', ...path.split('/').filter(Boolean)];
  };

  const refreshFiles = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get('/api/files');
      setFileTree(response.data);
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    refreshFiles();
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isLeftNavCollapsed,
        toggleLeftNav,
        currentPath,
        setCurrentPath,
        breadcrumbs: getBreadcrumbs(currentPath),
        refreshFiles,
        fileTree,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};