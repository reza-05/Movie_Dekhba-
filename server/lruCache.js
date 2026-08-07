import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, checkR2Status } from './r2Service.js';

/**
 * Enforces a strict storage limit on the Cloudflare R2 bucket.
 * If the total size of all objects exceeds the limit, it deletes the oldest files
 * until the total size is below the target threshold.
 * 
 * @param {number} limitGb Storage limit in Gigabytes (default: 9GB to stay under 10GB free tier)
 * @param {number} targetGb Target size in Gigabytes to reduce to after cleanup (default: 7GB)
 */
export async function enforceR2StorageLimit(limitGb = 9, targetGb = 7) {
  if (!checkR2Status() || !s3Client) {
    console.log('[LRU Cache] R2 not configured. Skipping storage limit check.');
    return;
  }

  const limitBytes = limitGb * 1024 * 1024 * 1024;
  const targetBytes = targetGb * 1024 * 1024 * 1024;

  try {
    console.log(`[LRU Cache] Checking R2 storage usage... Limit: ${limitGb} GB`);

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    if (objects.length === 0) {
      console.log('[LRU Cache] Bucket is empty. 0 bytes used.');
      return;
    }

    let totalSize = 0;
    const files = [];

    for (const obj of objects) {
      totalSize += obj.Size;
      files.push({
        key: obj.Key,
        size: obj.Size,
        lastModified: new Date(obj.LastModified).getTime()
      });
    }

    const totalSizeGb = totalSize / (1024 * 1024 * 1024);
    console.log(`[LRU Cache] Current storage usage: ${totalSizeGb.toFixed(2)} GB (${objects.length} files)`);

    if (totalSize <= limitBytes) {
      console.log('[LRU Cache] Storage is within limits. No cleanup required.');
      return;
    }

    console.log(`[LRU Cache] Storage limit exceeded! Initiating cleanup to target ${targetGb} GB...`);

    // Sort files by last modified timestamp ascending (oldest first)
    files.sort((a, b) => a.lastModified - b.lastModified);

    let deletedSize = 0;
    let deletedCount = 0;

    for (const file of files) {
      if (totalSize - deletedSize <= targetBytes) {
        break; // Reached target size threshold
      }

      console.log(`[LRU Cache] Purging oldest file: ${file.key} (${(file.size / (1024*1024)).toFixed(1)} MB)`);
      
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: file.key,
      });

      await s3Client.send(deleteCommand);
      deletedSize += file.size;
      deletedCount++;
    }

    const finalSizeGb = (totalSize - deletedSize) / (1024 * 1024 * 1024);
    console.log(`[LRU Cache] Cleanup completed. Deleted ${deletedCount} files, freed ${(deletedSize / (1024*1024*1024)).toFixed(2)} GB. Final usage: ${finalSizeGb.toFixed(2)} GB.`);

  } catch (error) {
    console.error('[LRU Cache Error] Failed to enforce storage limit:', error);
  }
}
