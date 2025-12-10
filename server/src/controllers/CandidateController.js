import mongoose from 'mongoose';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { Groq } from 'groq-sdk';
import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';

/**
 * CandidateController class handles all candidate-related operations
 */
class CandidateController {
  constructor() {
    this.groqClient = null;
  }

  /**
   * Get Groq client instance (lazy initialization)
   * @returns {Groq|null} Groq client instance
   */
  getGroqClient() {
    if (!this.groqClient && process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    }
    return this.groqClient;
  }

  /**
   * Get candidates for a specific job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCandidatesByJob(req, res) {
    try {
      const jobId = req.params.id;
      
      if (!jobId || jobId === 'undefined' || !mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }
      
      const candidates = await Candidate.find({ jobId }).sort({ createdAt: -1 });
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Process resume with Groq LLM
   * @param {string} resumeText - Resume text content
   * @param {string} jobDescription - Job description
   * @returns {Promise<Object>} Candidate data
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

      const client = this.getGroqClient();
      if (!client) {
        throw new Error('Groq API key not configured');
      }
      
      const completion = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-70b-8192",
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseContent = completion.choices[0].message.content;
      
      try {
        const cleanedResponse = responseContent
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        
        const parsedResponse = JSON.parse(cleanedResponse);
        
        if (!parsedResponse.name) {
          parsedResponse.name = "Unknown Candidate";
        }
        
        if (!parsedResponse.matchScore) {
          parsedResponse.matchScore = 50;
        }
        
        if (!parsedResponse.matchExplanation) {
          parsedResponse.matchExplanation = "Score based on general resume evaluation.";
        }
        
        return {
          name: parsedResponse.name,
          email: parsedResponse.email || `${parsedResponse.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          matchScore: parsedResponse.matchScore,
          matchExplanation: parsedResponse.matchExplanation,
          resumeText: truncatedResumeText.substring(0, 1000)
        };
      } catch (error) {
        console.error('Error parsing LLM response:', error, 'Raw response:', responseContent);
        return {
          name: "Unknown Candidate",
          email: "unknown.candidate@example.com",
          matchScore: 50,
          matchExplanation: "Unable to analyze resume properly. Score is an estimate.",
          resumeText: truncatedResumeText.substring(0, 1000)
        };
      }
    } catch (error) {
      console.error('Error processing with Groq LLM:', error);
      return {
        name: "Unknown Candidate",
        email: "unknown.candidate@example.com",
        matchScore: 50,
        matchExplanation: "Unable to analyze resume due to technical issues. Score is an estimate.",
        resumeText: resumeText.substring(0, 1000)
      };
    }
  }

  /**
   * Upload and process resumes (Admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadResumes(req, res) {
    try {
      const jobId = req.params.id;
      
      if (!jobId || jobId === 'undefined' || !mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }
      
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No resume files uploaded' });
      }

      if (req.files.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 resume files allowed' });
      }

      const processedCandidates = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const pdfBuffer = fs.readFileSync(file.path);
          const data = await pdfParse(pdfBuffer);
          const resumeText = data.text;

          const candidateData = await this.processResumeWithLLM(resumeText, job.description);
          candidateData.resumeUrl = file.path;
          
          const candidate = new Candidate({
            jobId,
            name: candidateData.name,
            email: candidateData.email,
            atsScore: candidateData.matchScore,
            matchExplanation: candidateData.matchExplanation,
            resumeUrl: candidateData.resumeUrl,
            resumeText: candidateData.resumeText
          });
          
          await candidate.save();
          processedCandidates.push(candidate);
        } catch (error) {
          console.error('Error processing resume:', error);
          errors.push({
            filename: file.originalname,
            error: error.message || 'Failed to process the uploaded resume'
          });
        }
      }

      res.json({
        success: processedCandidates.length > 0,
        candidates: processedCandidates,
        errors: errors,
        total: req.files.length,
        processed: processedCandidates.length,
        failed: errors.length
      });
    } catch (error) {
      console.error('Error processing resumes:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Schedule interview for a candidate (Admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async scheduleInterview(req, res) {
    try {
      const candidateId = req.params.id;
      
      if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate ID' });
      }
      
      const candidate = await Candidate.findById(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      
      candidate.interviewScheduled = true;
      candidate.interviewDate = req.body.interviewDate || new Date();
      
      await candidate.save();
      
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// Export a singleton instance
export default new CandidateController();
