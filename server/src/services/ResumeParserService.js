import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { BUCKET_NAME } from '../config/aws.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constants.js';

class ResumeParserService {
  /**
   * Parse resume from S3 and extract text
   * @param {string} s3Key - S3 object key
   * @returns {Promise<string>} Extracted text content
   */
  async parseResumeFromS3(s3Key) {
    try {
      logger.info('Starting resume parsing', { s3Key });

      // Download file from S3
      const fileBuffer = await this.downloadFromS3(s3Key);

      // Detect file type from extension
      const fileType = this.detectFileType(s3Key);

      // Extract text based on file type
      let extractedText;
      if (fileType === 'pdf') {
        extractedText = await this.extractTextFromPDF(fileBuffer);
      } else if (fileType === 'docx') {
        extractedText = await this.extractTextFromDOCX(fileBuffer);
      } else if (fileType === 'doc') {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'DOC format not supported. Please use DOCX or PDF.');
      } else {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Unsupported file format');
      }

      // Clean and normalize text
      const cleanedText = this.cleanText(extractedText);

      if (!cleanedText || cleanedText.trim().length === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No text content found in resume');
      }

      logger.info('Resume parsed successfully', { 
        s3Key, 
        textLength: cleanedText.length,
        fileType 
      });

      return cleanedText;
    } catch (error) {
      logger.error('Error parsing resume', { 
        s3Key, 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Download file from S3 as buffer
   * @param {string} s3Key - S3 object key
   * @returns {Promise<Buffer>} File buffer
   */
  async downloadFromS3(s3Key) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      const response = await s3Client.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Error downloading file from S3', { s3Key, error: error.message });
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to download resume from S3');
    }
  }

  /**
   * Detect file type from S3 key
   * @param {string} s3Key - S3 object key
   * @returns {string} File type (pdf, docx, doc)
   */
  detectFileType(s3Key) {
    const extension = s3Key.split('.').pop().toLowerCase();
    
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'doc') return 'doc';
    
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Unsupported file type');
  }

  /**
   * Extract text from PDF buffer
   * @param {Buffer} buffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting text from PDF', { error: error.message });
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to parse PDF file');
    }
  }

  /**
   * Extract text from DOCX buffer
   * @param {Buffer} buffer - DOCX file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Error extracting text from DOCX', { error: error.message });
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to parse DOCX file');
    }
  }

  /**
   * Clean and normalize extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might confuse AI
      .replace(/[^\w\s.,;:()@#$%&*+\-=[\]{}|<>?/\\'"]/g, '')
      // Normalize line breaks
      .replace(/\n+/g, '\n')
      // Trim
      .trim();
  }
}

export default new ResumeParserService();
