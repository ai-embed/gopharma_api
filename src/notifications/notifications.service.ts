import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationChannel,
  NotificationType
} from 'src/common/enums/domain.enums';
import { LocalizationService } from 'src/common/localization/localization.service';
import { MailerService } from 'src/common/services/mailer.service';
import { UsersService } from 'src/users/users.service';
import { Notification, NotificationDocument } from './schemas/notification.schema';

interface LocalizedNotificationContent {
  titleKey:
    | 'notification.validationApproved.title'
    | 'notification.validationRejected.title'
    | 'notification.accountSuspended.title'
    | 'notification.accountReactivated.title'
    | 'notification.productAvailable.title'
    | 'notification.lowStock.title'
    | 'notification.prescriptionReminder.title';
  messageKey:
    | 'notification.validationApproved.message'
    | 'notification.validationRejected.message'
    | 'notification.accountSuspended.message'
    | 'notification.accountReactivated.message'
    | 'notification.productAvailable.message'
    | 'notification.lowStock.message'
    | 'notification.prescriptionReminder.message';
  params?: Record<string, string | number | boolean | undefined>;
}

export interface PushNotificationSender {
  send: (input: {
    userId: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

export class NoopPushNotificationSender implements PushNotificationSender {
  async send(): Promise<void> {
    return;
  }
}

export const PUSH_NOTIFICATION_SENDER = 'PUSH_NOTIFICATION_SENDER';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly localizationService: LocalizationService,
    @Inject(PUSH_NOTIFICATION_SENDER)
    private readonly pushSender: PushNotificationSender
  ) {}

  async notifyUser(
    userId: string,
    type: NotificationType,
    content: LocalizedNotificationContent,
    metadata?: Record<string, unknown>
  ) {
    const user = await this.usersService.findById(userId);
    const channels = user.preferences?.channels ?? [NotificationChannel.IN_APP];
    const language = this.localizationService.normalizeLanguage(user.preferences?.language);
    const title = this.localizationService.translate(content.titleKey, language, content.params);
    const message = this.localizationService.translate(
      content.messageKey,
      language,
      content.params
    );

    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      sentAt: new Date(),
      isRead: false,
      channels,
      metadata
    });

    if (channels.includes(NotificationChannel.EMAIL)) {
      await this.mailerService.sendMail(user.email, title, message);
    }

    if (channels.includes(NotificationChannel.PUSH)) {
      await this.pushSender.send({
        userId,
        title,
        message,
        metadata
      });
    }

    return notification;
  }

  async list(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ sentAt: -1 })
      .limit(200)
      .exec();
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.notificationModel
      .findOneAndUpdate(
        {
          _id: notificationId,
          userId: new Types.ObjectId(userId)
        },
        {
          $set: { isRead: true }
        },
        { new: true }
      )
      .exec();

    return { success: true };
  }
}
