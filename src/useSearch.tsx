import { useState, useCallback } from 'react';
import axios from 'axios';

interface SearchMatch {
  line_number: number;
  match: string;
  context: string;
  start: number;
  end: number;
}

interface SearchResult {
  file_path: string;
  title: string;
  matches: SearchMatch[];
  last_modified: string;
}

interface SearchOptions {
  case_sensitive?: boolean;
  regex?: boolean;
  include_content?: boolean;
  paths?: string[];
  limit?: number;
  offset?: number;
  sort_by?: 'relevance' | 'modified' | 'path';
}

interface UseSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  searchFiles: (query: string, options?: SearchOptions) => Promise<void>;
  searchTags: (tag: string) => Promise<void>;
  clearResults: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchFiles = useCallback(async (query: string, options: SearchOptions = {}) => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/search/query', {
        query,
        case_sensitive: options.case_sensitive || false,
        regex: options.regex || false,
        include_content: options.include_content !== undefined ? options.include_content : true,
        paths: options.paths || [],
        limit: options.limit || 100,
        offset: options.offset || 0,
        sort_by: options.sort_by || 'relevance'
      });

      setResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchTags = useCallback(async (tag: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/search/tags/${tag}`);
      setResults(response.data);
    } catch (err) {
      console.error('Tag search error:', err);
      setError('An error occurred while searching for tags');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchFiles,
    searchTags,
    clearResults
  };
};

export default useSearch;