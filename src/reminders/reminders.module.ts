import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  PrescriptionReminder,
  PrescriptionReminderSchema
} from './schemas/prescription-reminder.schema';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrescriptionReminder.name, schema: PrescriptionReminderSchema }
    ]),
    NotificationsModule
  ],
  controllers: [RemindersController],
  providers: [RemindersService]
})
export class RemindersModule {}
