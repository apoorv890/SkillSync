import {
  DeleteObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { BUCKET_NAME } from '../config/aws.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/http.js';
import { S3_CONFIG } from '../utils/constants.js';
import path from 'path';

class S3Service {
  async uploadResume(file, userId) {
    try {
      const sanitizedFilename = path
        .basename(file.originalname)
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 100);

      const timestamp = Date.now();
      const ext = path.extname(sanitizedFilename).toLowerCase();

      const allowedExts = ['.pdf', '.doc', '.docx'];
      if (!allowedExts.includes(ext)) {
        throw new ApiError(
          400,
          'Invalid file extension. Only PDF, DOC, and DOCX files are allowed.'
        );
      }

      const s3Key = `${S3_CONFIG.RESUME_FOLDER}/user-${userId}-${timestamp}${ext}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype
      });

      await s3Client.send(command);

      const location = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

      logger.info('Resume uploaded to S3', {
        s3Key,
        fileName: file.originalname
      });

      return {
        location,
        key: s3Key,
        bucket: BUCKET_NAME
      };
    } catch (error) {
      logger.error(`Error uploading resume to S3: ${error.message}`, {
        error: error.stack
      });
      throw new ApiError(500, 'Failed to upload resume');
    }
  }

  async deleteFile(s3Key) {
    try {
      if (!s3Key) {
        throw new ApiError(400, 'S3 key is required');
      }

      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      await s3Client.send(command);

      logger.info('File deleted from S3', { s3Key });
      return true;
    } catch (error) {
      logger.error(`Error deleting file from S3: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }

  async getPreSignedUrl(s3Key, expiresIn = S3_CONFIG.PRESIGNED_URL_EXPIRY) {
    try {
      if (!s3Key) {
        throw new ApiError(400, 'S3 key is required');
      }

      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });

      logger.info('Pre-signed URL generated', {
        s3Key,
        expiresIn: `${expiresIn}s`
      });
      return url;
    } catch (error) {
      logger.error(`Error generating pre-signed URL: ${error.message}`, {
        error: error.stack
      });
      throw new ApiError(500, 'Failed to generate resume URL');
    }
  }

  async fileExists(s3Key) {
    try {
      if (!s3Key) {
        return false;
      }

      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error(`Error checking file existence: ${error.message}`);
      throw error;
    }
  }
}

export default new S3Service();

