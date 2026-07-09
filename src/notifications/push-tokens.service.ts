import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PushToken, PushTokenDocument } from './schemas/push-token.schema';

@Injectable()
export class PushTokensService {
  constructor(
    @InjectModel(PushToken.name)
    private readonly pushTokenModel: Model<PushTokenDocument>
  ) {}

  async register(userId: string, token: string, platform?: string) {
    if (!token?.trim()) {
      return { success: true };
    }

    await this.pushTokenModel
      .updateOne(
        { token },
        {
          $set: {
            userId: new Types.ObjectId(userId),
            token: token.trim(),
            platform: platform?.trim()
          }
        },
        { upsert: true }
      )
      .exec();

    return { success: true };
  }

  async remove(userId: string, token: string) {
    if (!token?.trim()) {
      return { success: true };
    }

    await this.pushTokenModel
      .deleteOne({ token: token.trim(), userId: new Types.ObjectId(userId) })
      .exec();

    return { success: true };
  }

  async list(userId: string) {
    return this.pushTokenModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async listTokens(userId: string) {
    const tokens = await this.pushTokenModel
      .find({ userId: new Types.ObjectId(userId) })
      .select({ token: 1 })
      .exec();
    return tokens.map((item) => item.token);
  }
}
