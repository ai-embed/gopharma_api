import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationSender } from './notifications.service';
import { PushTokensService } from './push-tokens.service';

@Injectable()
export class DatabasePushNotificationSender implements PushNotificationSender {
  private readonly logger = new Logger(DatabasePushNotificationSender.name);

  constructor(private readonly pushTokensService: PushTokensService) {}

  async send(input: {
    userId: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const tokens = await this.pushTokensService.listTokens(input.userId);
    if (tokens.length === 0) {
      return;
    }

    this.logger.log(
      `Push notification queued for user ${input.userId} (${tokens.length} device(s))`
    );
  }
}
