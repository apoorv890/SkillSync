import { 
  DeleteObjectCommand, 
  PutObjectCommand, 
  HeadObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { BUCKET_NAME } from '../config/aws.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { S3_CONFIG } from '../config/constants.js';
import path from 'path';

class S3Service {
  /**
   * Upload resume to S3
   * @param {Object} file - Multer file object
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadResume(file, userId) {
    try {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
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
      logger.error(`Error uploading resume to S3: ${error.message}`, { error: error.stack });
      throw new ApiError(500, 'Failed to upload resume');
    }
  }

  /**
   * Delete file from S3
   * @param {string} s3Key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
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

      logger.info('🗑️  File deleted from S3', { s3Key });
      return true;
    } catch (error) {
      logger.error(`Error deleting file from S3: ${error.message}`, { error: error.stack });
      throw error;
    }
  }

  /**
   * Generate pre-signed URL for file access
   * @param {string} s3Key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} Pre-signed URL
   */
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

      logger.info('🔗 Pre-signed URL generated', { 
        s3Key,
        expiresIn: `${expiresIn}s` 
      });
      return url;
    } catch (error) {
      logger.error(`Error generating pre-signed URL: ${error.message}`, { error: error.stack });
      throw new ApiError(500, 'Failed to generate resume URL');
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} s3Key - S3 object key
   * @returns {Promise<boolean>} True if file exists
   */
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
