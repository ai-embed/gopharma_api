import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // Configuration Cloudinary (à remplacer par vos vraies credentials)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
      api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret',
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    transformation?: object
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: transformation || {
            quality: 'auto',
            fetch_format: 'auto',
          },
        },
        (
          error: unknown,
          result:
            | {
                secure_url: string;
                public_id: string;
                width: number;
                height: number;
                format: string;
              }
            | undefined
        ) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(error);
            return;
          }
          if (!result) {
            reject(new Error('Upload failed - no result'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      );

      // Convertir le buffer en stream et pipe vers Cloudinary
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting image:', error);
      throw error;
    }
  }

  getOptimizedUrl(url: string, width?: number, height?: number): string {
    if (!url) return url;
    
    // Transformer l'URL pour ajouter les paramètres d'optimisation
    const transformations = ['q_auto', 'f_auto'];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (width || height) transformations.push('c_fill');

    return url.replace('/upload/', `/upload/${transformations.join(',')}/`);
  }
}
