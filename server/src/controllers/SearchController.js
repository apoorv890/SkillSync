import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';
import { 
  isLikelyJobTitle, 
  createExactMatchRegex, 
  createPartialMatchRegex, 
  normalizeQuery 
} from '../utils/searchUtils.js';

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
      
      if (query && query.trim() !== '') {
        searchCriteria.$text = { $search: query };
      }
      
      if (department) searchCriteria.department = department;
      if (location) searchCriteria.location = location;
      if (status) searchCriteria.status = status;
      
      let jobs;
      
      if (query && query.trim() !== '') {
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
      
      if (query && query.trim() !== '') {
        searchCriteria.$text = { $search: query };
      }
      
      if (jobId) searchCriteria.jobId = jobId;
      
      if (minScore !== undefined || maxScore !== undefined) {
        searchCriteria.atsScore = {};
        if (minScore !== undefined) searchCriteria.atsScore.$gte = parseInt(minScore);
        if (maxScore !== undefined) searchCriteria.atsScore.$lte = parseInt(maxScore);
      }
      
      let candidates;
      
      if (query && query.trim() !== '') {
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
      
      if (!query || query.trim() === '') {
        return res.json({ jobs: [], candidates: [] });
      }
      
      const normalizedQuery = normalizeQuery(query);
      const jobTitleQuery = isLikelyJobTitle(normalizedQuery);
      
      const results = {
        jobs: [],
        candidates: []
      };
      
      // JOBS SEARCH
      const exactJobMatches = await Job.find({ 
        $or: [
          { title: createExactMatchRegex(query) },
          { searchableTitle: normalizedQuery }
        ]
      }).limit(5);
      
      if (exactJobMatches.length > 0) {
        results.jobs = exactJobMatches;
      } else {
        const partialTitleMatches = await Job.find({
          title: createPartialMatchRegex(query)
        }).limit(8);
        
        if (partialTitleMatches.length > 0) {
          results.jobs = partialTitleMatches;
        } else {
          const jobSearchCriteria = { $text: { $search: query } };
          
          if (jobTitleQuery) {
            const jobTextMatches = await Job.find(
              jobSearchCriteria,
              { 
                score: { $meta: "textScore" },
                titleMatch: {
                  $cond: {
                    if: { $regexMatch: { input: "$title", regex: createPartialMatchRegex(query) } },
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
            { name: createExactMatchRegex(query) },
            { searchableName: normalizedQuery }
          ]
        }).limit(5);
        
        if (exactNameMatches.length > 0) {
          results.candidates = exactNameMatches;
        } else {
          const partialNameMatches = await Candidate.find({
            name: createPartialMatchRegex(query)
          }).limit(8);
          
          if (partialNameMatches.length > 0) {
            results.candidates = partialNameMatches;
          } else {
            results.candidates = await Candidate.find(
              { $text: { $search: query } },
              { score: { $meta: "textScore" } }
            )
            .sort({ score: { $meta: "textScore" } })
            .limit(5);
          }
        }
      } else {
        results.candidates = await Candidate.find(
          { $text: { $search: query } },
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
      
      if (!prefix || prefix.trim() === '') {
        return res.json([]);
      }
      
      const titleRegex = new RegExp(`^${prefix}`, 'i');
      const departmentRegex = new RegExp(`^${prefix}`, 'i');
      const locationRegex = new RegExp(`^${prefix}`, 'i');
      
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
        if (job.title.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.add(job.title);
        }
        
        if (job.department.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.add(job.department);
        }
        
        if (job.location.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.add(job.location);
        }
        
        job.keywords.forEach(keyword => {
          if (keyword.toLowerCase().startsWith(prefix.toLowerCase())) {
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
      
      if (!prefix || prefix.trim() === '') {
        return res.json([]);
      }
      
      const searchCriteria = {
        $or: [
          { name: new RegExp(`^${prefix}`, 'i') },
          { email: new RegExp(`^${prefix}`, 'i') },
          { skills: new RegExp(`^${prefix}`, 'i') }
        ]
      };
      
      if (jobId) {
        searchCriteria.jobId = jobId;
      }
      
      const candidates = await Candidate.find(searchCriteria).limit(10);
      
      const suggestions = new Set();
      
      candidates.forEach(candidate => {
        if (candidate.name.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.add(candidate.name);
        }
        
        if (candidate.email.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.add(candidate.email);
        }
        
        candidate.skills.forEach(skill => {
          if (skill.toLowerCase().startsWith(prefix.toLowerCase())) {
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
