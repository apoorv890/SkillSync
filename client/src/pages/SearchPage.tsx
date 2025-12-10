import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import SearchResults from '../components/SearchResults';

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({ jobs: [], candidates: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Update URL when query changes
  useEffect(() => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
    } else {
      navigate('/search', { replace: true });
    }
  }, [query, navigate]);

  // Perform search when query changes
  useEffect(() => {
    if (!initialQuery) return;
    
    const performSearch = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/search/unified?query=${encodeURIComponent(initialQuery)}`);
        
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
    };

    performSearch();
  }, [initialQuery]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleJobSelect = (job) => {
    navigate(`/jobs/${job._id}`);
  };

  const handleCandidateSelect = (candidate) => {
    navigate(`/jobs/${candidate.jobId._id}`);
  };

  const hasResults = results.jobs.length > 0 || results.candidates.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search Jobs and Candidates</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search for jobs or candidates..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <button 
              type="submit"
              className="absolute inset-y-0 right-0 px-4 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <>
            {hasSearched && (
              <div className="bg-white shadow-md rounded-md overflow-hidden">
                {hasResults ? (
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-lg font-medium">
                        Search results for "{initialQuery}"
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Found {results.jobs.length} jobs and {results.candidates.length} candidates
                      </p>
                    </div>
                    <SearchResults 
                      jobs={results.jobs}
                      candidates={results.candidates}
                      onJobSelect={handleJobSelect}
                      onCandidateSelect={handleCandidateSelect}
                      query={initialQuery}
                    />
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-xl text-gray-500">No results found for "{initialQuery}"</p>
                    <p className="text-gray-400 mt-2">Try adjusting your search terms or try a different search</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
