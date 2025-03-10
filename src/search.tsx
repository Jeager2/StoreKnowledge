import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';
import { Link } from 'react-router-dom';

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

interface SearchProps {
  onResultSelect?: (filePath: string) => void;
}

const Search: React.FC<SearchProps> = ({ onResultSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    case_sensitive: false,
    regex: false,
    sort_by: 'relevance',
  });

  const debouncedQuery = useDebounce(query, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle search when query changes
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchOptions]);

  // Get suggestions as user types
  useEffect(() => {
    if (query.length > 1) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const performSearch = async () => {
    if (!debouncedQuery) return;

    setIsSearching(true);
    try {
      const response = await axios.post('/api/search/query', {
        query: debouncedQuery,
        case_sensitive: searchOptions.case_sensitive,
        regex: searchOptions.regex,
        include_content: true,
        sort_by: searchOptions.sort_by,
        limit: 20,
        offset: 0
      });

      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`/api/search/suggestions?query=${query}`);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Suggestion error:', error);
    }
  };

  const handleResultClick = (filePath: string) => {
    if (onResultSelect) {
      onResultSelect(filePath);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Highlight matched text
  const highlightMatch = (text: string, start: number, end: number) => {
    const prefix = text.substring(0, start);
    const match = text.substring(start, end);
    const suffix = text.substring(end);

    return (
      <>
        {prefix}
        <span className="bg-yellow-200 font-bold">{match}</span>
        {suffix}
      </>
    );
  };

  return (
    <div className="search-container w-full">
      <div className="relative">
        <div className="flex items-center border border-gray-300 rounded-lg">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search files..."
            className="w-full p-2 rounded-lg"
          />

          {isSearching && (
            <div className="mr-2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}

          <button
            onClick={performSearch}
            disabled={debouncedQuery.length < 2}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
          >
            Search
          </button>
        </div>

        {/* Search suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white shadow-lg rounded-b-lg border border-gray-300 mt-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => applySuggestion(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search options */}
      <div className="flex items-center space-x-4 mt-2 text-sm">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={searchOptions.case_sensitive}
            onChange={() => setSearchOptions({...searchOptions, case_sensitive: !searchOptions.case_sensitive})}
            className="mr-1"
          />
          Case sensitive
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={searchOptions.regex}
            onChange={() => setSearchOptions({...searchOptions, regex: !searchOptions.regex})}
            className="mr-1"
          />
          RegEx
        </label>

        <div className="flex items-center">
          <span className="mr-2">Sort:</span>
          <select
            value={searchOptions.sort_by}
            onChange={(e) => setSearchOptions({...searchOptions, sort_by: e.target.value})}
            className="border rounded px-2 py-1"
          >
            <option value="relevance">Relevance</option>
            <option value="modified">Recent</option>
            <option value="path">Path</option>
          </select>
        </div>
      </div>

      {/* Search results */}
      <div className="search-results mt-4">
        {results.length === 0 && debouncedQuery.length > 2 && !isSearching && (
          <div className="text-gray-500">No results found</div>
        )}

        {results.map((result, index) => (
          <div key={index} className="result-item mb-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div
              className="result-title text-lg font-medium text-blue-600 cursor-pointer"
              onClick={() => handleResultClick(result.file_path)}
            >
              {result.title || result.file_path}
            </div>

            <div className="result-path text-gray-500 text-sm mb-2">
              {result.file_path}
            </div>

            <div className="result-matches">
              {result.matches.slice(0, 3).map((match, matchIndex) => (
                <div key={matchIndex} className="match-item text-sm my-1 pl-4 border-l-2 border-gray-300">
                  <div className="line-number text-gray-400">Line {match.line_number}</div>
                  <div className="match-context">
                    {highlightMatch(match.context, match.start, match.end)}
                  </div>
                </div>
              ))}

              {result.matches.length > 3 && (
                <div className="text-gray-500 text-sm mt-1">
                  +{result.matches.length - 3} more matches
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;