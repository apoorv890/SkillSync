import { Briefcase, User, MapPin, Building2, TrendingUp } from 'lucide-react';
import { Badge } from './ui/badge';

const SearchResults = ({ jobs = [], candidates = [], onJobSelect, onCandidateSelect, query }) => {
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span> : 
        part
    );
  };

  return (
    <div className="space-y-6">
      {/* Jobs Section */}
      {jobs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Jobs ({jobs.length})
          </h3>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                onClick={() => onJobSelect(job)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {highlightText(job.title, query)}
                    </h4>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                      {job.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {highlightText(job.department, query)}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {highlightText(job.location, query)}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {highlightText(job.description.substring(0, 150), query)}...
                      </p>
                    )}
                  </div>
                  <Badge variant={job.status === 'active' ? 'success' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidates Section */}
      {candidates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Candidates ({candidates.length})
          </h3>
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div
                key={candidate._id}
                onClick={() => onCandidateSelect(candidate)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {highlightText(candidate.name, query)}
                    </h4>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                      <span>{candidate.email}</span>
                      {candidate.jobId && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {candidate.jobId.title}
                        </span>
                      )}
                    </div>
                    {candidate.matchExplanation && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {candidate.matchExplanation}
                      </p>
                    )}
                  </div>
                  {candidate.atsScore !== undefined && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-lg font-bold text-blue-600">
                        {candidate.atsScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {jobs.length === 0 && candidates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-2">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
