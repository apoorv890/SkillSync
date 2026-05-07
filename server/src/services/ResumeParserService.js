import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { BUCKET_NAME } from '../config/aws.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import logger from '../utils/logger.js';
import { ApiError, HTTP_STATUS } from '../utils/http.js';

class ResumeParserService {
  async parseResumeFromS3(s3Key) {
    try {
      logger.info('Starting resume parsing', { s3Key });

      const fileBuffer = await this.downloadFromS3(s3Key);

      const fileType = this.detectFileType(s3Key);

      let extractedText;
      if (fileType === 'pdf') {
        extractedText = await this.extractTextFromPDF(fileBuffer);
      } else if (fileType === 'docx') {
        extractedText = await this.extractTextFromDOCX(fileBuffer);
      } else if (fileType === 'doc') {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'DOC format not supported. Please use DOCX or PDF.'
        );
      } else {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Unsupported file format');
      }

      const cleanedText = this.cleanText(extractedText);

      if (!cleanedText || cleanedText.trim().length === 0) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'No text content found in resume'
        );
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

  async downloadFromS3(s3Key) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      const response = await s3Client.send(command);

      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Error downloading file from S3', {
        s3Key,
        error: error.message
      });
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to download resume from S3'
      );
    }
  }

  detectFileType(s3Key) {
    const extension = s3Key.split('.').pop().toLowerCase();

    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'doc') return 'doc';

    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Unsupported file type');
  }

  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting text from PDF', { error: error.message });
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to parse PDF file'
      );
    }
  }

  async extractTextFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Error extracting text from DOCX', { error: error.message });
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to parse DOCX file'
      );
    }
  }

  cleanText(text) {
    if (!text) return '';

    return (
      text
        // Remove excessive whitespace
        .replace(/\\s+/g, ' ')
        // Remove special characters that might confuse AI
        .replace(/[^\\w\\s.,;:()@#$%&*+\\-=[\\]{}|<>?/\\\\'\\\"]/g, '')
        // Normalize line breaks
        .replace(/\\n+/g, '\\n')
        // Trim
        .trim()
    );
  }
}

export default new ResumeParserService();

