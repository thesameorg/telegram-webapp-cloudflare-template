import { eq, and } from 'drizzle-orm';
import type { Database } from '../db';
import { postImages } from '../db/schema';
import type { PostImage } from '../db/schema';
import type { Env } from '../types/env';

export interface ImageUploadData {
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  uploadOrder: number;
  imageBuffer: ArrayBuffer;
  thumbnailBuffer: ArrayBuffer;
}

export interface ImageUrlData {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  originalName: string;
  fileSize: number;
  uploadOrder: number;
}

export class ImageService {
  private r2BaseUrl: string;
  private r2: Env['IMAGES'];

  constructor(
    private db: Database,
    r2: Env['IMAGES'],
    private env?: Env
  ) {
    this.r2 = r2;

    // Simplified constructor for profile-only usage
    if (!env) {
      this.r2BaseUrl = 'https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev';
      return;
    }
    // In local development, serve images through the worker's /r2 endpoint
    // In production, use the direct R2 public URL for better performance
    if (env.ENVIRONMENT === 'local' || env.ENVIRONMENT === 'development') {
      // Use ngrok URL if available (for mobile access), otherwise localhost
      const baseUrl = env.LOCAL_BASE_URL || 'http://localhost:3000';
      this.r2BaseUrl = `${baseUrl}/r2`;
    } else {
      // Direct R2 public URL for production (most efficient)
      this.r2BaseUrl = 'https://pub-733fa418a1974ad8aaea18a49e4154b9.r2.dev';
    }
  }

  private generateImageKey(postId: number, filename: string): string {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    return `images/${postId}/full/${timestamp}_${uuid}_${filename}`;
  }

  private generateThumbnailKey(postId: number, filename: string): string {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    return `images/${postId}/thumbs/${timestamp}_${uuid}_thumb_${filename}`;
  }

  private generateImageUrl(key: string): string {
    return `${this.r2BaseUrl}/${key}`;
  }

  async uploadImage(postId: number, imageData: ImageUploadData): Promise<PostImage> {
    const imageKey = this.generateImageKey(postId, imageData.originalName);
    const thumbnailKey = this.generateThumbnailKey(postId, imageData.originalName);

    // Upload full image to R2
    await this.r2.put(imageKey, imageData.imageBuffer, {
      httpMetadata: {
        contentType: imageData.mimeType,
      },
      customMetadata: {
        originalName: imageData.originalName,
        postId: postId.toString(),
        width: imageData.width.toString(),
        height: imageData.height.toString(),
      }
    });

    // Upload thumbnail to R2
    await this.r2.put(thumbnailKey, imageData.thumbnailBuffer, {
      httpMetadata: {
        contentType: imageData.mimeType,
      },
      customMetadata: {
        originalName: imageData.originalName,
        postId: postId.toString(),
        type: 'thumbnail',
      }
    });

    // Save metadata to database
    const now = new Date().toISOString();
    const [newImage] = await this.db.insert(postImages).values({
      postId,
      originalName: imageData.originalName,
      imageKey,
      thumbnailKey,
      mimeType: imageData.mimeType,
      fileSize: imageData.fileSize,
      width: imageData.width,
      height: imageData.height,
      uploadOrder: imageData.uploadOrder,
      createdAt: now,
    }).returning();

    return newImage;
  }

  async uploadImages(postId: number, imagesData: ImageUploadData[]): Promise<PostImage[]> {
    const results: PostImage[] = [];

    for (const imageData of imagesData) {
      try {
        const image = await this.uploadImage(postId, imageData);
        results.push(image);
      } catch (error) {
        // If any upload fails, cleanup uploaded images and throw
        await this.cleanupPostImages(postId);
        throw error;
      }
    }

    return results;
  }

  async getPostImages(postId: number): Promise<ImageUrlData[]> {
    const images = await this.db
      .select()
      .from(postImages)
      .where(eq(postImages.postId, postId))
      .orderBy(postImages.uploadOrder);

    return images.map(image => ({
      id: image.id,
      imageUrl: this.generateImageUrl(image.imageKey),
      thumbnailUrl: this.generateImageUrl(image.thumbnailKey),
      width: image.width,
      height: image.height,
      originalName: image.originalName,
      fileSize: image.fileSize,
      uploadOrder: image.uploadOrder,
    }));
  }

  async deleteImage(imageId: number, postId: number): Promise<boolean> {
    // Get image metadata
    const [image] = await this.db
      .select()
      .from(postImages)
      .where(and(eq(postImages.id, imageId), eq(postImages.postId, postId)))
      .limit(1);

    if (!image) {
      return false;
    }

    // Delete from R2
    try {
      await this.r2.delete(image.imageKey);
      await this.r2.delete(image.thumbnailKey);
    } catch (error) {
      console.error('Failed to delete from R2:', error);
      // Continue to delete from database even if R2 deletion fails
    }

    // Delete from database
    const [deletedImage] = await this.db
      .delete(postImages)
      .where(and(eq(postImages.id, imageId), eq(postImages.postId, postId)))
      .returning();

    return !!deletedImage;
  }

  async cleanupPostImages(postId: number): Promise<void> {
    // Get all images for the post
    const images = await this.db
      .select()
      .from(postImages)
      .where(eq(postImages.postId, postId));

    // Delete from R2
    for (const image of images) {
      try {
        await this.r2.delete(image.imageKey);
        await this.r2.delete(image.thumbnailKey);
      } catch (error) {
        console.error(`Failed to delete image ${image.id} from R2:`, error);
      }
    }

    // Delete from database
    await this.db
      .delete(postImages)
      .where(eq(postImages.postId, postId));
  }

  async validateImageFile(buffer: ArrayBuffer, mimeType: string): Promise<boolean> {
    // Check file size (1MB limit for full images)
    if (buffer.byteLength > 1024 * 1024) {
      return false;
    }

    // Check MIME type - only accept compressed formats (all files are converted to JPEG on frontend)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return false;
    }

    return true;
  }

  async validateThumbnailFile(buffer: ArrayBuffer): Promise<boolean> {
    // Check file size (100KB limit for thumbnails)
    return buffer.byteLength <= 100 * 1024;
  }

  async getImageCount(postId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: postImages.id })
      .from(postImages)
      .where(eq(postImages.postId, postId));

    return result?.count || 0;
  }

  async uploadProfileImage(file: File, profileImageKey: string): Promise<void> {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Simple resize logic - for now, just upload as-is
    // In a real implementation, you might want to resize to exactly 512x512
    await this.r2.put(profileImageKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        type: 'profile_avatar',
        uploadedAt: new Date().toISOString(),
      }
    });
  }

  getProfileImageUrl(key: string | null): string | null {
    if (!key) return null;
    return `${this.r2BaseUrl}/${key}`;
  }
}