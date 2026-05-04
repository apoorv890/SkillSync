import { generateGeminiText } from '@skillsync/shared/gemini';
import logger from '@skillsync/shared/logger';
import { ApiError } from '@skillsync/shared/http';
import { HTTP_STATUS } from '@skillsync/shared/constants';

class ATSScoreService {
  constructor() {
    this.model =
      process.env.GEMINI_ATS_MODEL ||
      process.env.GEMINI_MODEL ||
      'gemini-2.0-flash';
    this.maxRetries = 3;

    this.weights = {
      skills: 0.35,
      experience: 0.3,
      education: 0.15,
      keywords: 0.2,
    };

    this.skillSynonyms = {
      javascript: ['js', 'ecmascript', 'es6', 'es2015'],
      typescript: ['ts'],
      python: ['py'],
      react: ['reactjs', 'react.js'],
      node: ['nodejs', 'node.js'],
      database: ['db', 'databases', 'data storage'],
      sql: ['mysql', 'postgresql', 'postgres', 'sqlite'],
      nosql: ['mongodb', 'mongo', 'dynamodb', 'cassandra'],
      aws: ['amazon web services', 'cloud'],
      docker: ['containerization', 'containers'],
      kubernetes: ['k8s', 'orchestration'],
      'ci/cd': ['continuous integration', 'continuous deployment', 'devops'],
      agile: ['scrum', 'kanban'],
      frontend: ['front-end', 'ui', 'client-side'],
      backend: ['back-end', 'server-side'],
      fullstack: ['full-stack', 'full stack'],
    };
  }

  /**
   * @param {string} resumeText
   * @param {object} jobDetails
   */
  async generateATSScore(resumeText, jobDetails) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Generating ATS score (attempt ${attempt}/${this.maxRetries})`, {
          jobTitle: jobDetails.title,
          resumeLength: resumeText.length,
          model: this.model,
        });

        const prompt = this.constructPrompt(resumeText, jobDetails);

        let response = await generateGeminiText(prompt, {
          model: this.model,
          temperature: 0.3,
          maxOutputTokens: 1024,
        });

        if (!response) {
          throw new Error('Empty response from Gemini');
        }

        response = this.stripMarkdownFences(response);

        const scoreData = this.parseDetailedScoreFromResponse(response);

        const totalScore = this.calculateWeightedScore(scoreData.breakdown);
        scoreData.totalScore = totalScore;

        logger.info('ATS score generated successfully', {
          totalScore,
          breakdown: scoreData.breakdown,
          attempt,
          jobTitle: jobDetails.title,
        });

        return scoreData;
      } catch (error) {
        lastError = error;
        logger.warn(`ATS score generation failed (attempt ${attempt}/${this.maxRetries})`, {
          error: error.message,
          jobTitle: jobDetails.title,
        });

        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    logger.error('ATS score generation failed after all retries', {
      error: lastError.message,
      jobTitle: jobDetails.title,
    });

    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      `Failed to generate ATS score: ${lastError.message}`
    );
  }

  constructPrompt(resumeText, jobDetails) {
    return `You are an expert ATS (Applicant Tracking System) analyzer. Analyze the candidate's resume against the job description and provide scores for each category.

JOB DETAILS:
Title: ${jobDetails.title}
Department: ${jobDetails.department || 'Not specified'}
Location: ${jobDetails.location || 'Not specified'}
Description: ${jobDetails.description}
Requirements: ${jobDetails.requirements}

CANDIDATE RESUME:
${resumeText.substring(0, 4000)}

INSTRUCTIONS:
Analyze the resume and provide scores (0-100) for each category:

1. SKILLS MATCH (0-100): How well do the candidate's technical and soft skills match the job requirements?
   - Consider exact matches, related skills, and skill level
   - Account for synonyms (e.g., JS = JavaScript, React.js = React)
   - Weight: 35% of total score

2. EXPERIENCE MATCH (0-100): How relevant is the candidate's work experience?
   - Years of experience vs required
   - Relevance of previous roles
   - Industry experience
   - Weight: 30% of total score

3. EDUCATION MATCH (0-100): Does the candidate meet educational requirements?
   - Degree level and field of study
   - Certifications and training
   - Continuous learning
   - Weight: 15% of total score

4. KEYWORD MATCH (0-100): How many job description keywords appear in the resume?
   - Exact keyword matches
   - Context and usage
   - Density and relevance
   - Weight: 20% of total score

Scoring Guide:
- 0-40: Poor match
- 41-60: Average match
- 61-80: Good match
- 81-100: Excellent match

CRITICAL: Respond in EXACTLY this format (numbers only, one per line):
SKILLS: [score]
EXPERIENCE: [score]
EDUCATION: [score]
KEYWORDS: [score]
MATCH_SUMMARY: [brief 1-sentence explanation]

Example:
SKILLS: 75
EXPERIENCE: 82
EDUCATION: 65
KEYWORDS: 70
MATCH_SUMMARY: Strong technical skills and relevant experience, meets most requirements.`;
  }

  stripMarkdownFences(text) {
    let t = text.trim();
    if (t.startsWith('```')) {
      t = t.replace(/^```[a-zA-Z0-9_-]*\s*/m, '').replace(/\s*```$/m, '');
    }
    return t.trim();
  }

  parseDetailedScoreFromResponse(response) {
    try {
      const breakdown = {};
      let matchSummary = '';

      const skillsMatch = response.match(/SKILLS:\s*(\d+)/i);
      const experienceMatch = response.match(/EXPERIENCE:\s*(\d+)/i);
      const educationMatch = response.match(/EDUCATION:\s*(\d+)/i);
      const keywordsMatch = response.match(/KEYWORDS:\s*(\d+)/i);
      const summaryMatch = response.match(/MATCH_SUMMARY:\s*(.+)/i);

      if (!skillsMatch || !experienceMatch || !educationMatch || !keywordsMatch) {
        throw new Error('Missing category scores in AI response');
      }

      breakdown.skills = this.validateScore(parseInt(skillsMatch[1], 10));
      breakdown.experience = this.validateScore(parseInt(experienceMatch[1], 10));
      breakdown.education = this.validateScore(parseInt(educationMatch[1], 10));
      breakdown.keywords = this.validateScore(parseInt(keywordsMatch[1], 10));

      if (summaryMatch) {
        matchSummary = summaryMatch[1].trim();
      }

      return {
        breakdown,
        matchSummary,
        totalScore: 0,
      };
    } catch (error) {
      logger.warn('Failed to parse detailed score, falling back to simple parsing', {
        error: error.message,
      });

      const match = response.match(/\d+/);
      if (!match) {
        throw new Error('No numerical score found in AI response');
      }

      const score = this.validateScore(parseInt(match[0], 10));

      return {
        breakdown: {
          skills: score,
          experience: score,
          education: score,
          keywords: score,
        },
        matchSummary: 'Score generated without detailed breakdown',
        totalScore: score,
      };
    }
  }

  validateScore(score) {
    if (isNaN(score) || score < 0 || score > 100) {
      throw new Error(`Invalid score: ${score}. Must be between 0-100`);
    }
    return score;
  }

  calculateWeightedScore(breakdown) {
    const weightedScore =
      breakdown.skills * this.weights.skills +
      breakdown.experience * this.weights.experience +
      breakdown.education * this.weights.education +
      breakdown.keywords * this.weights.keywords;

    return Math.round(weightedScore);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new ATSScoreService();
