import * as searchRead from '../services/searchReadService.js';
import { sanitizeSearchQuery } from '@skillsync/shared/security';

class SearchController {
  async searchJobs(req, res) {
    try {
      const { query, department, location, status } = req.query;
      const jobs = await searchRead.searchJobsWithFilters({ query, department, location, status });
      res.json(jobs);
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async searchCandidates(req, res) {
    try {
      const { query, jobId, minScore, maxScore } = req.query;
      const candidates = await searchRead.searchCandidatesFiltered({
        query,
        jobId,
        minScore,
        maxScore
      });
      res.json(candidates);
    } catch (error) {
      console.error('Error searching candidates:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async unifiedSearch(req, res) {
    try {
      const { query } = req.query;

      const sanitizedQuery = sanitizeSearchQuery(query);
      if (!sanitizedQuery) {
        return res.json({ jobs: [], candidates: [] });
      }

      const [jobs, candidates] = await Promise.all([
        searchRead.unifiedSearchJobsOnly(sanitizedQuery),
        searchRead.unifiedSearchCandidatesPart(sanitizedQuery)
      ]);

      res.json({ jobs, candidates });
    } catch (error) {
      console.error('Error performing unified search:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getJobSuggestions(req, res) {
    try {
      const { prefix } = req.query;
      const suggestions = await searchRead.getJobSuggestions(prefix);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting job suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCandidateSuggestions(req, res) {
    try {
      const { prefix, jobId } = req.query;
      const suggestions = await searchRead.getCandidateSuggestionsInternal(prefix, jobId);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting candidate suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new SearchController();
