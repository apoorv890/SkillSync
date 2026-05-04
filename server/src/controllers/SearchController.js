import * as jobsClient from '../services/jobsClient.js';
import * as applicationsClient from '../services/applicationsClient.js';
import { sanitizeSearchQuery } from '@skillsync/shared/security';

class SearchController {
  async searchJobs(req, res) {
    try {
      const { query, department, location, status } = req.query;
      const jobs = await jobsClient.searchJobsFiltered({ query, department, location, status });
      res.json(jobs);
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async searchCandidates(req, res) {
    try {
      const { query, jobId, minScore, maxScore } = req.query;
      const candidates = await applicationsClient.searchCandidatesFiltered({
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

      const results = {
        jobs: await jobsClient.unifiedSearchJobs(sanitizedQuery),
        candidates: await applicationsClient.unifiedSearchCandidates(sanitizedQuery)
      };

      res.json(results);
    } catch (error) {
      console.error('Error performing unified search:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getJobSuggestions(req, res) {
    try {
      const { prefix } = req.query;
      const suggestions = await jobsClient.getJobSuggestions(prefix);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting job suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCandidateSuggestions(req, res) {
    try {
      const { prefix, jobId } = req.query;
      const suggestions = await applicationsClient.getCandidateSuggestions(prefix, jobId);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting candidate suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new SearchController();
