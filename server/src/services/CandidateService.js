import { generateGeminiText } from '../utils/gemini.js';
import logger from '../utils/logger.js';

class CandidateService {
  /**
   * Process resume text with Gemini LLM to extract candidate info and ATS score.
   * @param {string} resumeText - Full resume text
   * @param {string} jobDescription - Job description to score against
   * @returns {Promise<Object>} Extracted candidate data
   */
  async processResumeWithLLM(resumeText, jobDescription) {
    try {
      const truncatedResumeText = resumeText.substring(0, 3000);
      const truncatedJobDescription = jobDescription.substring(0, 1000);

      const prompt = `
You are an AI assistant specialized in analyzing resumes for job applications.

JOB DESCRIPTION:
${truncatedJobDescription}

RESUME TEXT:
${truncatedResumeText}

Based on the resume and job description, extract the following information in JSON format:
1. Candidate's full name
2. Candidate's email address (if available, otherwise return null)
3. A match score (0-100) representing how well the candidate's skills and experience match the job description
4. A brief explanation (2-3 sentences) of the match score

Return ONLY a valid JSON object with the following structure:
{
  "name": "Candidate's full name",
  "email": "candidate@example.com",
  "matchScore": 85,
  "matchExplanation": "Brief explanation of the score"
}
`;

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const model =
        process.env.GEMINI_CANDIDATE_MODEL ||
        process.env.GEMINI_MODEL ||
        'gemini-2.0-flash';

      const responseContent = await generateGeminiText(prompt, {
        model,
        temperature: 0.3,
        maxOutputTokens: 2048
      });

      try {
        const cleanedResponse = responseContent
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsedResponse = JSON.parse(cleanedResponse);

        if (!parsedResponse.name) {
          parsedResponse.name = 'Unknown Candidate';
        }

        if (!parsedResponse.matchScore) {
          parsedResponse.matchScore = 50;
        }

        if (!parsedResponse.matchExplanation) {
          parsedResponse.matchExplanation =
            'Score based on general resume evaluation.';
        }

        return {
          name: parsedResponse.name,
          email:
            parsedResponse.email ||
            `${parsedResponse.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          matchScore: parsedResponse.matchScore,
          matchExplanation: parsedResponse.matchExplanation,
          resumeText: truncatedResumeText.substring(0, 1000)
        };
      } catch (error) {
        logger.error('Error parsing LLM response:', { error, responseContent });
        return {
          name: 'Unknown Candidate',
          email: 'unknown.candidate@example.com',
          matchScore: 50,
          matchExplanation:
            'Unable to analyze resume properly. Score is an estimate.',
          resumeText: truncatedResumeText.substring(0, 1000)
        };
      }
    } catch (error) {
      logger.error('Error processing with Gemini:', error);
      return {
        name: 'Unknown Candidate',
        email: 'unknown.candidate@example.com',
        matchScore: 50,
        matchExplanation:
          'Unable to analyze resume due to technical issues. Score is an estimate.',
        resumeText: resumeText.substring(0, 1000)
      };
    }
  }
}

export default new CandidateService();
