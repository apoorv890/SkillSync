import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';
import { 
  isLikelyJobTitle, 
  createExactMatchRegex, 
  createPartialMatchRegex, 
  normalizeQuery 
} from '../utils/searchUtils.js';
import { 
  sanitizeSearchQuery, 
  sanitizeJobStatus, 
  sanitizeDepartment, 
  sanitizeLocation,
  sanitizeNumericFilter,
  sanitizeObjectId,
  sanitizePrefix
} from '@skillsync/shared/security';

/**
 * SearchController class handles all search-related operations
 */
class SearchController {
  /**
   * Search jobs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchJobs(req, res) {
    try {
      const { query, department, location, status } = req.query;
      
      const searchCriteria = {};
      
      // Sanitize search query
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (sanitizedQuery) {
        searchCriteria.$text = { $search: sanitizedQuery };
      }
      
      // Sanitize filters
      const sanitizedDepartment = sanitizeDepartment(department);
      if (sanitizedDepartment) {
        searchCriteria.department = sanitizedDepartment;
      }
      
      const sanitizedLocation = sanitizeLocation(location);
      if (sanitizedLocation) {
        searchCriteria.location = sanitizedLocation;
      }
      
      const sanitizedStatus = sanitizeJobStatus(status);
      if (sanitizedStatus) {
        searchCriteria.status = sanitizedStatus;
      }
      
      let jobs;
      
      if (sanitizedQuery) {
        jobs = await Job.find(
          searchCriteria,
          { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .limit(20);
      } else {
        jobs = await Job.find(searchCriteria)
          .sort({ createdAt: -1 })
          .limit(20);
      }
      
      res.json(jobs);
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Search candidates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchCandidates(req, res) {
    try {
      const { query, jobId, minScore, maxScore } = req.query;
      
      const searchCriteria = {};
      
      // Sanitize search query
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (sanitizedQuery) {
        searchCriteria.$text = { $search: sanitizedQuery };
      }
      
      // Sanitize job ID
      const sanitizedJobId = sanitizeObjectId(jobId);
      if (sanitizedJobId) {
        searchCriteria.jobId = sanitizedJobId;
      }
      
      // Sanitize score filters
      if (minScore !== undefined || maxScore !== undefined) {
        searchCriteria.atsScore = {};
        const sanitizedMin = sanitizeNumericFilter(minScore, 0, 100);
        const sanitizedMax = sanitizeNumericFilter(maxScore, 0, 100);
        if (sanitizedMin !== null) searchCriteria.atsScore.$gte = sanitizedMin;
        if (sanitizedMax !== null) searchCriteria.atsScore.$lte = sanitizedMax;
      }
      
      let candidates;
      
      if (sanitizedQuery) {
        candidates = await Candidate.find(
          searchCriteria,
          { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .limit(20);
      } else {
        candidates = await Candidate.find(searchCriteria)
          .sort({ createdAt: -1 })
          .limit(20);
      }
      
      res.json(candidates);
    } catch (error) {
      console.error('Error searching candidates:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Unified search for both jobs and candidates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async unifiedSearch(req, res) {
    try {
      const { query } = req.query;
      
      // Sanitize search query
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (!sanitizedQuery) {
        return res.json({ jobs: [], candidates: [] });
      }
      
      const normalizedQuery = normalizeQuery(sanitizedQuery);
      const jobTitleQuery = isLikelyJobTitle(normalizedQuery);
      
      const results = {
        jobs: [],
        candidates: []
      };
      
      // JOBS SEARCH
      const exactJobMatches = await Job.find({ 
        $or: [
          { title: createExactMatchRegex(sanitizedQuery) },
          { searchableTitle: normalizedQuery }
        ]
      }).limit(5);
      
      if (exactJobMatches.length > 0) {
        results.jobs = exactJobMatches;
      } else {
        const partialTitleMatches = await Job.find({
          title: createPartialMatchRegex(sanitizedQuery)
        }).limit(8);
        
        if (partialTitleMatches.length > 0) {
          results.jobs = partialTitleMatches;
        } else {
          const jobSearchCriteria = { $text: { $search: sanitizedQuery } };
          
          if (jobTitleQuery) {
            const jobTextMatches = await Job.find(
              jobSearchCriteria,
              { 
                score: { $meta: "textScore" },
                titleMatch: {
                  $cond: {
                    if: { $regexMatch: { input: "$title", regex: createPartialMatchRegex(sanitizedQuery) } },
                    then: 10,
                    else: 0
                  }
                }
              }
            )
            .sort({ titleMatch: -1, score: { $meta: "textScore" } })
            .limit(10);
            
            results.jobs = jobTextMatches;
          } else {
            const jobTextMatches = await Job.find(
              jobSearchCriteria,
              { score: { $meta: "textScore" } }
            )
            .sort({ score: { $meta: "textScore" } })
            .limit(5);
            
            results.jobs = jobTextMatches;
          }
        }
      }
      
      // CANDIDATES SEARCH
      if (!jobTitleQuery) {
        const exactNameMatches = await Candidate.find({
          $or: [
            { name: createExactMatchRegex(sanitizedQuery) },
            { searchableName: normalizedQuery }
          ]
        }).limit(5);
        
        if (exactNameMatches.length > 0) {
          results.candidates = exactNameMatches;
        } else {
          const partialNameMatches = await Candidate.find({
            name: createPartialMatchRegex(sanitizedQuery)
          }).limit(8);
          
          if (partialNameMatches.length > 0) {
            results.candidates = partialNameMatches;
          } else {
            results.candidates = await Candidate.find(
              { $text: { $search: sanitizedQuery } },
              { score: { $meta: "textScore" } }
            )
            .sort({ score: { $meta: "textScore" } })
            .limit(5);
          }
        }
      } else {
        results.candidates = await Candidate.find(
          { $text: { $search: sanitizedQuery } },
          { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(3);
      }
      
      if (results.candidates.length > 0) {
        results.candidates = await Candidate.populate(results.candidates, {
          path: 'jobId',
          select: 'title department'
        });
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error performing unified search:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get job suggestions for type-ahead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getJobSuggestions(req, res) {
    try {
      const { prefix } = req.query;
      
      // Sanitize prefix to prevent regex injection
      const sanitizedPrefix = sanitizePrefix(prefix);
      if (!sanitizedPrefix) {
        return res.json([]);
      }
      
      const titleRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
      const departmentRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
      const locationRegex = new RegExp(`^${sanitizedPrefix}`, 'i');
      
      const jobs = await Job.find({
        $or: [
          { title: titleRegex },
          { department: departmentRegex },
          { location: locationRegex },
          { keywords: titleRegex }
        ]
      }).limit(10);
      
      const suggestions = new Set();
      
      jobs.forEach(job => {
        if (job.title.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(job.title);
        }
        
        if (job.department.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(job.department);
        }
        
        if (job.location.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(job.location);
        }
        
        job.keywords.forEach(keyword => {
          if (keyword.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
            suggestions.add(keyword);
          }
        });
      });
      
      res.json(Array.from(suggestions).slice(0, 10));
    } catch (error) {
      console.error('Error getting job suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get candidate suggestions for type-ahead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCandidateSuggestions(req, res) {
    try {
      const { prefix, jobId } = req.query;
      
      // Sanitize prefix to prevent regex injection
      const sanitizedPrefix = sanitizePrefix(prefix);
      if (!sanitizedPrefix) {
        return res.json([]);
      }
      
      const searchCriteria = {
        $or: [
          { name: new RegExp(`^${sanitizedPrefix}`, 'i') },
          { email: new RegExp(`^${sanitizedPrefix}`, 'i') },
          { skills: new RegExp(`^${sanitizedPrefix}`, 'i') }
        ]
      };
      
      // Sanitize job ID
      const sanitizedJobId = sanitizeObjectId(jobId);
      if (sanitizedJobId) {
        searchCriteria.jobId = sanitizedJobId;
      }
      
      const candidates = await Candidate.find(searchCriteria).limit(10);
      
      const suggestions = new Set();
      
      candidates.forEach(candidate => {
        if (candidate.name.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(candidate.name);
        }
        
        if (candidate.email.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(candidate.email);
        }
        
        candidate.skills.forEach(skill => {
          if (skill.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
            suggestions.add(skill);
          }
        });
      });
      
      res.json(Array.from(suggestions).slice(0, 10));
    } catch (error) {
      console.error('Error getting candidate suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

// Export a singleton instance
export default new SearchController();
