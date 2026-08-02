import * as searchRead from '../services/searchService.js';

class SearchController {
  async searchJobs(req, res) {
    try {
      const { query, department, location, status } = req.query;
      const jobs = await searchRead.searchJobsWithFilters({
        query,
        department,
        location,
        status
      });
      res.json(jobs);
    } catch (error) {
      console.error('Error searching jobs:', error);
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
}

export default new SearchController();
