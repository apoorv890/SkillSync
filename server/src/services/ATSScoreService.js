import Groq from 'groq-sdk';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constants.js';

class ATSScoreService {
  constructor() {
    this.groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    // Using llama-3.3-70b-versatile - latest and best free model
    this.model = 'llama-3.3-70b-versatile';
    this.maxRetries = 2;
    
    // Weighted scoring categories
    this.weights = {
      skills: 0.35,        // 35% - Most important
      experience: 0.30,    // 30% - Very important
      education: 0.15,     // 15% - Important
      keywords: 0.20       // 20% - Important for ATS
    };
    
    // Common skill synonyms for better matching
    this.skillSynonyms = {
      'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
      'typescript': ['ts'],
      'python': ['py'],
      'react': ['reactjs', 'react.js'],
      'node': ['nodejs', 'node.js'],
      'database': ['db', 'databases', 'data storage'],
      'sql': ['mysql', 'postgresql', 'postgres', 'sqlite'],
      'nosql': ['mongodb', 'mongo', 'dynamodb', 'cassandra'],
      'aws': ['amazon web services', 'cloud'],
      'docker': ['containerization', 'containers'],
      'kubernetes': ['k8s', 'orchestration'],
      'ci/cd': ['continuous integration', 'continuous deployment', 'devops'],
      'agile': ['scrum', 'kanban'],
      'frontend': ['front-end', 'ui', 'client-side'],
      'backend': ['back-end', 'server-side'],
      'fullstack': ['full-stack', 'full stack']
    };
  }

  /**
   * Generate detailed ATS score with category breakdown
   * @param {string} resumeText - Extracted resume text (NOT stored)
   * @param {object} jobDetails - Job description and requirements
   * @returns {Promise<object>} ATS score with detailed breakdown
   */
  async generateATSScore(resumeText, jobDetails) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Generating ATS score (attempt ${attempt}/${this.maxRetries})`, {
          jobTitle: jobDetails.title,
          resumeLength: resumeText.length
        });

        // Construct prompt
        const prompt = this.constructPrompt(resumeText, jobDetails);

        // Call Groq AI
        const completion = await this.groqClient.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          model: this.model,
          temperature: 0.3,
          max_tokens: 50,
          top_p: 1,
          stream: false
        });

        const response = completion.choices[0]?.message?.content;

        if (!response) {
          throw new Error('Empty response from Groq AI');
        }

        // Parse detailed score from response
        const scoreData = this.parseDetailedScoreFromResponse(response);
        
        // Calculate weighted total score
        const totalScore = this.calculateWeightedScore(scoreData.breakdown);
        scoreData.totalScore = totalScore;

        logger.info('ATS score generated successfully', { 
          totalScore,
          breakdown: scoreData.breakdown,
          attempt,
          jobTitle: jobDetails.title
        });

        return scoreData;

      } catch (error) {
        lastError = error;
        logger.warn(`ATS score generation failed (attempt ${attempt}/${this.maxRetries})`, {
          error: error.message,
          jobTitle: jobDetails.title
        });

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    // All retries failed
    logger.error('ATS score generation failed after all retries', {
      error: lastError.message,
      jobTitle: jobDetails.title
    });

    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      `Failed to generate ATS score: ${lastError.message}`
    );
  }

  /**
   * Construct detailed prompt for Groq AI with category breakdown
   * @param {string} resumeText - Resume text
   * @param {object} jobDetails - Job details
   * @returns {string} Formatted prompt
   */
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

  /**
   * Parse detailed score breakdown from AI response
   * @param {string} response - AI response
   * @returns {object} Parsed score data with breakdown
   */
  parseDetailedScoreFromResponse(response) {
    try {
      const breakdown = {};
      let matchSummary = '';
      
      // Extract scores for each category
      const skillsMatch = response.match(/SKILLS:\s*(\d+)/);
      const experienceMatch = response.match(/EXPERIENCE:\s*(\d+)/);
      const educationMatch = response.match(/EDUCATION:\s*(\d+)/);
      const keywordsMatch = response.match(/KEYWORDS:\s*(\d+)/);
      const summaryMatch = response.match(/MATCH_SUMMARY:\s*(.+)/);
      
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
        totalScore: 0 // Will be calculated separately
      };
    } catch (error) {
      logger.warn('Failed to parse detailed score, falling back to simple parsing', {
        error: error.message
      });
      
      // Fallback: extract first number as overall score
      const match = response.match(/\d+/);
      if (!match) {
        throw new Error('No numerical score found in AI response');
      }
      
      const score = this.validateScore(parseInt(match[0], 10));
      
      // Create balanced breakdown
      return {
        breakdown: {
          skills: score,
          experience: score,
          education: score,
          keywords: score
        },
        matchSummary: 'Score generated without detailed breakdown',
        totalScore: score
      };
    }
  }
  
  /**
   * Validate score is within range
   * @param {number} score - Score to validate
   * @returns {number} Validated score
   */
  validateScore(score) {
    if (isNaN(score) || score < 0 || score > 100) {
      throw new Error(`Invalid score: ${score}. Must be between 0-100`);
    }
    return score;
  }
  
  /**
   * Calculate weighted total score from category breakdown
   * @param {object} breakdown - Category scores
   * @returns {number} Weighted total score (0-100)
   */
  calculateWeightedScore(breakdown) {
    const weightedScore = 
      (breakdown.skills * this.weights.skills) +
      (breakdown.experience * this.weights.experience) +
      (breakdown.education * this.weights.education) +
      (breakdown.keywords * this.weights.keywords);
    
    return Math.round(weightedScore);
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ATSScoreService();
