import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountStatus } from '../common/enums/domain.enums';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async findById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async getMe(userId: string): Promise<UserDocument> {
    return this.findById(userId);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            ...(dto.language && { 'preferences.language': dto.language }),
            ...(dto.timezone && { 'preferences.timezone': dto.timezone }),
            ...(dto.channels && { 'preferences.channels': dto.channels }),
            ...(dto.alertsEnabled !== undefined && {
              'preferences.alertsEnabled': dto.alertsEnabled
            }),
            ...(dto.theme && { 'preferences.theme': dto.theme })
          }
        },
        { new: true }
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteMe(userId: string): Promise<void> {
    const result = await this.userModel
      .findByIdAndUpdate(userId, {
        $set: {
          isActive: false,
          accountStatus: AccountStatus.SUSPENDU
        }
      })
      .exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File
  ): Promise<{ user: UserDocument; photoUrl: string }> {
    const user = await this.findById(userId);

    // Si l'utilisateur a déjà une photo, la supprimer d'abord
    if (user.profilePhotoUrl) {
      try {
        // Extraire le public_id de l'URL Cloudinary
        const publicId = this.extractPublicIdFromUrl(user.profilePhotoUrl);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        this.logger.warn('Failed to delete old photo:', error);
        // Continue quand même
      }
    }

    // Uploader la nouvelle photo
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `users/${userId}/profile`,
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
      }
    );

    // Mettre à jour l'utilisateur avec la nouvelle URL
    user.profilePhotoUrl = uploadResult.url;
    await user.save();

    return { user, photoUrl: uploadResult.url };
  }

  async deleteProfilePhoto(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);

    if (user.profilePhotoUrl) {
      try {
        const publicId = this.extractPublicIdFromUrl(user.profilePhotoUrl);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        this.logger.warn('Failed to delete photo:', error);
      }

      user.profilePhotoUrl = undefined;
      await user.save();
    }

    return user;
  }

  private extractPublicIdFromUrl(url: string): string | null {
    // Extrait le public_id d'une URL Cloudinary
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
    const match = url.match(/\/upload\/[^/]+\/(.+)\.[^.]+$/);
    return match ? match[1] : null;
  }

  async listUsers(status?: AccountStatus): Promise<UserDocument[]> {
    const query = status ? { accountStatus: status } : {};
    return this.userModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async ensureActiveUser(userId: string): Promise<void> {
    const exists = await this.userModel
      .exists({ _id: new Types.ObjectId(userId), isActive: true })
      .exec();

    if (!exists) {
      throw new NotFoundException('User inactive or not found');
    }
  }
}
