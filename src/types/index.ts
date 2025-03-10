// Authentication types
export interface UserData {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserData;
}

// File system types
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  modified: string; // ISO date string
  size?: number;
}

export interface DirectoryListing {
  path: string;
  items: FileItem[];
}

export interface FileContent {
  path: string;
  content: string;
  modified: string; // ISO date string
}

// Search types
export interface SearchResult {
  path: string;
  name: string;
  preview: string;
  matches: number;
}

// Markdown types
export interface MarkdownRenderResult {
  html: string;
  toc?: TocItem[];
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

// DataView types
export interface DataViewQuery {
  query: string;
  source?: string;
}

export interface DataViewResult {
  headers: string[];
  rows: any[][];
}

export interface BookItem {
  title: string;
  author: string;
  cover?: string;
  genre?: string;
  publisher?: string;
  publish?: string;
  totalPage?: number;
  rating?: number;
  completed: boolean;
  status: string;
}

export interface MovieItem {
  title: string;
  year?: number;
  director?: string;
  poster?: string;
  scoreImdb?: number;
  rating?: string;
  genre?: string;
  status: string;
  completed: boolean;
}

// Kanban types
export interface KanbanCard {
  id: string;
  content: string;
  tags: string[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  settings: {
    tagColors: {
      tagKey: string;
      color: string;
      backgroundColor: string;
    }[];
    hideTagsDisplay: boolean;
    hideTagsInTitle: boolean;
    laneWidth: number;
    newNoteFolder: string;
  };
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  autoSave: boolean;
  autoSaveInterval: number;
}

// Editor types
export type EditorMode = 'wysiwyg' | 'source' | 'read';