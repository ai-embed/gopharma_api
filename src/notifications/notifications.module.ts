import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerService } from '../common/services/mailer.service';
import { UsersModule } from '../users/users.module';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { PushToken, PushTokenSchema } from './schemas/push-token.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService, PUSH_NOTIFICATION_SENDER } from './notifications.service';
import { PushTokensService } from './push-tokens.service';
import { DatabasePushNotificationSender } from './push-notification.sender';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: PushToken.name, schema: PushTokenSchema }
    ]),
    forwardRef(() => UsersModule)
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushTokensService,
    MailerService,
    { provide: PUSH_NOTIFICATION_SENDER, useClass: DatabasePushNotificationSender }
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}
