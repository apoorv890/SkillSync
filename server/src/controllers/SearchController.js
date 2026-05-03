import Candidate from '../models/Candidate.js';
import * as jobsClient from '../services/jobsClient.js';
import {
  isLikelyJobTitle,
  createExactMatchRegex,
  createPartialMatchRegex,
  normalizeQuery
} from '../utils/searchUtils.js';
import {
  sanitizeSearchQuery,
  sanitizeNumericFilter,
  sanitizeObjectId,
  sanitizePrefix
} from '@skillsync/shared/security';

function pickJobPopulateShape(job) {
  if (!job) {
    return null;
  }
  return {
    _id: job._id,
    title: job.title,
    department: job.department,
    location: job.location,
    status: job.status
  };
}

async function populateCandidatesJobId(candidates) {
  const ids = [...new Set(candidates.map((c) => String(c.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(ids);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return candidates.map((c) => ({
    ...c,
    jobId: pickJobPopulateShape(map.get(String(c.jobId))) || c.jobId
  }));
}

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

      const searchCriteria = {};

      const sanitizedQuery = sanitizeSearchQuery(query);
      if (sanitizedQuery) {
        searchCriteria.$text = { $search: sanitizedQuery };
      }

      const sanitizedJobId = sanitizeObjectId(jobId);
      if (sanitizedJobId) {
        searchCriteria.jobId = sanitizedJobId;
      }

      if (minScore !== undefined || maxScore !== undefined) {
        searchCriteria.atsScore = {};
        const sanitizedMin = sanitizeNumericFilter(minScore, 0, 100);
        const sanitizedMax = sanitizeNumericFilter(maxScore, 0, 100);
        if (sanitizedMin !== null) searchCriteria.atsScore.$gte = sanitizedMin;
        if (sanitizedMax !== null) searchCriteria.atsScore.$lte = sanitizedMax;
      }

      let candidates;

      if (sanitizedQuery) {
        candidates = await Candidate.find(searchCriteria, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .limit(20);
      } else {
        candidates = await Candidate.find(searchCriteria).sort({ createdAt: -1 }).limit(20);
      }

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

      const normalizedQuery = normalizeQuery(sanitizedQuery);
      const jobTitleQuery = isLikelyJobTitle(normalizedQuery);

      const results = {
        jobs: [],
        candidates: []
      };

      results.jobs = await jobsClient.unifiedSearchJobs(sanitizedQuery);

      if (!jobTitleQuery) {
        const exactNameMatches = await Candidate.find({
          $or: [{ name: createExactMatchRegex(sanitizedQuery) }, { searchableName: normalizedQuery }]
        })
          .limit(5)
          .lean();

        if (exactNameMatches.length > 0) {
          results.candidates = exactNameMatches;
        } else {
          const partialNameMatches = await Candidate.find({
            name: createPartialMatchRegex(sanitizedQuery)
          })
            .limit(8)
            .lean();

          if (partialNameMatches.length > 0) {
            results.candidates = partialNameMatches;
          } else {
            results.candidates = await Candidate.find(
              { $text: { $search: sanitizedQuery } },
              { score: { $meta: 'textScore' } }
            )
              .sort({ score: { $meta: 'textScore' } })
              .limit(5)
              .lean();
          }
        }
      } else {
        results.candidates = await Candidate.find(
          { $text: { $search: sanitizedQuery } },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .limit(3)
          .lean();
      }

      if (results.candidates.length > 0) {
        results.candidates = await populateCandidatesJobId(results.candidates);
      }

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

      const sanitizedJobId = sanitizeObjectId(jobId);
      if (sanitizedJobId) {
        searchCriteria.jobId = sanitizedJobId;
      }

      const candidates = await Candidate.find(searchCriteria).limit(10);

      const suggestions = new Set();

      candidates.forEach((candidate) => {
        if (candidate.name.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(candidate.name);
        }

        if (candidate.email.toLowerCase().startsWith(sanitizedPrefix.toLowerCase())) {
          suggestions.add(candidate.email);
        }

        candidate.skills.forEach((skill) => {
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

export default new SearchController();
