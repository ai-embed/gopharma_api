import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Connection } from 'mongoose';

@Injectable()
export class FilesService {
  private bucket: GridFSBucket;

  constructor(@InjectConnection() connection: Connection) {
    if (!connection.db) {
      throw new Error('Mongo connection database is not initialized');
    }

    this.bucket = new GridFSBucket(connection.db, { bucketName: 'files' });
  }

  async uploadFile(file: Express.Multer.File, metadata?: Record<string, unknown>) {
    return new Promise<{ fileId: string; filename: string }>((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
        metadata
      });

      uploadStream.on('error', reject);
      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id.toString(),
          filename: file.originalname
        });
      });

      uploadStream.end(file.buffer);
    });
  }

  async getFileInfo(fileId: string) {
    const files = await this.bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (files.length === 0) {
      throw new NotFoundException('File not found');
    }
    return files[0];
  }

  openDownloadStream(fileId: string) {
    return this.bucket.openDownloadStream(new ObjectId(fileId));
  }
}
