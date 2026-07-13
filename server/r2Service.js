import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const isConfigured = !!(
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_BUCKET_NAME
);

let s3Client = null;

if (isConfigured) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
      },
    });
    console.log('[R2 Service] Initialized Cloudflare R2 S3 Client successfully.');
  } catch (error) {
    console.error('[R2 Service] Failed to initialize S3 Client:', error);
  }
} else {
  console.log('[R2 Service] Cloudflare R2 is not configured in .env (Hybrid Mode: WebRTC Fallback Active).');
}

/**
 * Check if R2 is fully configured and active
 */
export const checkR2Status = () => {
  return isConfigured && s3Client !== null;
};

/**
 * Generate a secure presigned upload URL and corresponding public streaming URL
 * @param {string} fileName Original name of the file
 * @param {string} fileType MIME content type (e.g. video/mp4)
 */
export const generateUploadUrl = async (fileName, fileType) => {
  if (!checkR2Status()) {
    throw new Error('R2 is not configured.');
  }

  // Generate a unique key to prevent name collisions in the bucket
  const uniqueId = Math.random().toString(36).substring(2, 11);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${uniqueId}-${sanitizedName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Valid for 1 hour

  // Construct public streaming URL
  let publicUrl = '';
  if (process.env.CLOUDFLARE_R2_PUBLIC_URL) {
    const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, '');
    publicUrl = `${baseUrl}/${key}`;
  } else {
    publicUrl = `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`;
  }

  return { uploadUrl, publicUrl, key };
};
