import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload profile photo to S3
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} userId - User ID
 * @param {string} userRole - User role (admin or user)
 * @param {string} fileExtension - File extension (jpg, png, etc.)
 * @returns {Promise<{url: string, key: string}>}
 */
export const uploadProfilePhoto = async (fileBuffer, userId, userRole, fileExtension) => {
  try {
    // Determine folder based on role
    const folder = userRole === 'admin' ? 'hr' : 'candidates';
    
    // Generate S3 key
    const key = `profile_pics/${folder}/user_${userId}_profile.${fileExtension}`;
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: `image/${fileExtension}`,
      CacheControl: 'max-age=31536000' // Cache for 1 year
      // Note: ACL removed - bucket must have public access configured via bucket policy
    });

    await s3Client.send(command);

    // Generate public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return { url, key };
  } catch (error) {
    console.error(`S3 upload error: ${error.message}`);
    throw new Error(`Failed to upload profile photo to S3: ${error.message}`);
  }
};

/**
 * Delete profile photo from S3
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
export const deleteProfilePhoto = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete profile photo from S3');
  }
};

/**
 * Check if profile photo exists in S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>}
 */
export const profilePhotoExists = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};
