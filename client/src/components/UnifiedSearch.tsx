import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import SearchResults from './SearchResults';

const UnifiedSearch = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ jobs: [], candidates: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ jobs: [], candidates: [] });
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/search/unified?query=${encodeURIComponent(searchQuery)}`
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResults(data);
      setHasSearched(true);
    } catch (error) {
      console.error('Error performing unified search:', error);
      setResults({ jobs: [], candidates: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query) {
        performSearch(query);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  const handleJobSelect = (job) => {
    window.location.href = `/jobs/${job._id}`;
  };

  const handleCandidateSelect = (candidate) => {
    if (candidate.jobId?._id) {
      window.location.href = `/jobs/${candidate.jobId._id}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs and candidates..."
              className="flex-1 text-lg outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Results */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : hasSearched ? (
            <SearchResults
              jobs={results.jobs}
              candidates={results.candidates}
              onJobSelect={handleJobSelect}
              onCandidateSelect={handleCandidateSelect}
              query={query}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Start typing to search...</p>
              <p className="text-sm mt-2">Search across jobs and candidates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSearch;
