import mongoose from 'mongoose';
import pdfParse from 'pdf-parse';
import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/http.js';
import CandidateService from '../services/CandidateService.js';

/**
 * CandidateController class handles all candidate-related operations
 */
class CandidateController {
  async getCandidatesByJob(req, res) {
    try {
      const jobId = req.params.id;

      if (
        !jobId ||
        jobId === 'undefined' ||
        !mongoose.Types.ObjectId.isValid(jobId)
      ) {
        return ApiResponse.error(res, 'Invalid job ID', 400);
      }

      const candidates = await Candidate.find({ jobId }).sort({ createdAt: -1 });
      res.json(candidates);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }

  async uploadResumes(req, res) {
    try {
      const jobId = req.params.id;

      if (
        !jobId ||
        jobId === 'undefined' ||
        !mongoose.Types.ObjectId.isValid(jobId)
      ) {
        return ApiResponse.error(res, 'Invalid job ID', 400);
      }

      const job = await Job.findById(jobId).lean();
      if (!job) {
        return ApiResponse.error(res, 'Job not found', 404);
      }

      const jobDescription =
        job.description ||
        [job.summary, job.keyResponsibilities, job.requiredSkills]
          .filter(Boolean)
          .join('\n\n');

      if (!req.files || req.files.length === 0) {
        return ApiResponse.error(res, 'No resume files uploaded', 400);
      }

      if (req.files.length > 5) {
        return ApiResponse.error(res, 'Maximum 5 resume files allowed', 400);
      }

      const processedCandidates = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const pdfBuffer = file.buffer;
          if (!pdfBuffer?.length) {
            throw new Error('Empty file upload');
          }
          const data = await pdfParse(pdfBuffer);
          const resumeText = data.text;

          const candidateData = await CandidateService.processResumeWithLLM(
            resumeText,
            jobDescription
          );
          candidateData.resumeUrl = null;

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
          logger.error('Error processing resume:', error);
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
      logger.error('Error processing resumes:', error);
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async scheduleInterview(req, res) {
    try {
      const candidateId = req.params.id;

      if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
        return ApiResponse.error(res, 'Invalid candidate ID', 400);
      }

      const candidate = await Candidate.findById(candidateId);

      if (!candidate) {
        return ApiResponse.error(res, 'Candidate not found', 404);
      }

      candidate.interviewScheduled = true;
      candidate.interviewDate = req.body.interviewDate || new Date();

      await candidate.save();

      res.json(candidate);
    } catch (error) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
}

export default new CandidateController();

