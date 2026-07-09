import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationType, ReminderFrequency } from 'src/common/enums/domain.enums';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import {
  PrescriptionReminder,
  PrescriptionReminderDocument
} from './schemas/prescription-reminder.schema';

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(PrescriptionReminder.name)
    private readonly reminderModel: Model<PrescriptionReminderDocument>,
    private readonly notificationsService: NotificationsService
  ) {}

  async list(userId: string) {
    return this.reminderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ nextRunAt: 1 })
      .exec();
  }

  async create(userId: string, dto: CreateReminderDto) {
    const { intervalHours, frequency } = this.resolveInterval(dto.frequency, dto.intervalHours);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const now = new Date();
    const nextRunAt = this.computeNextRunAt(startDate, intervalHours, now);

    return this.reminderModel.create({
      userId: new Types.ObjectId(userId),
      medicationName: dto.medicationName,
      note: dto.note,
      frequency,
      intervalHours,
      startDate,
      endDate,
      nextRunAt,
      isActive: true
    });
  }

  async update(userId: string, reminderId: string, dto: UpdateReminderDto) {
    const reminder = await this.reminderModel
      .findOne({ _id: reminderId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    if (dto.medicationName !== undefined) {
      reminder.medicationName = dto.medicationName;
    }
    if (dto.note !== undefined) {
      reminder.note = dto.note;
    }
    if (dto.isActive !== undefined) {
      reminder.isActive = dto.isActive;
    }

    const nextFrequency = dto.frequency ?? reminder.frequency;
    const nextInterval = dto.intervalHours ?? reminder.intervalHours;
    const { intervalHours, frequency } = this.resolveInterval(nextFrequency, nextInterval);

    reminder.frequency = frequency;
    reminder.intervalHours = intervalHours;

    if (dto.startDate !== undefined) {
      reminder.startDate = new Date(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      reminder.endDate = new Date(dto.endDate);
    }

    if (reminder.endDate && reminder.endDate < reminder.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const now = new Date();
    reminder.nextRunAt = this.computeNextRunAt(reminder.startDate, intervalHours, now);

    await reminder.save();
    return reminder;
  }

  async remove(userId: string, reminderId: string) {
    await this.reminderModel
      .deleteOne({ _id: reminderId, userId: new Types.ObjectId(userId) })
      .exec();
    return { success: true };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueReminders() {
    const now = new Date();
    const dueReminders = await this.reminderModel
      .find({
        isActive: true,
        nextRunAt: { $lte: now },
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }]
      })
      .limit(200)
      .exec();

    for (const reminder of dueReminders) {
      await this.sendReminder(reminder, now);
    }
  }

  private async sendReminder(reminder: PrescriptionReminderDocument, now: Date) {
    const nextRunAt = this.computeNextRunAt(reminder.nextRunAt, reminder.intervalHours, now);
    const shouldDeactivate = Boolean(reminder.endDate && nextRunAt > reminder.endDate);

    await this.notificationsService.notifyUser(
      reminder.userId.toString(),
      NotificationType.RAPPEL_ORDONNANCE,
      {
        titleKey: 'notification.prescriptionReminder.title',
        messageKey: 'notification.prescriptionReminder.message',
        params: {
          medicationName: reminder.medicationName
        }
      },
      {
        reminderId: reminder._id.toString(),
        medicationName: reminder.medicationName
      }
    );

    await this.reminderModel
      .updateOne(
        { _id: reminder._id, nextRunAt: reminder.nextRunAt },
        {
          $set: {
            lastSentAt: now,
            nextRunAt,
            isActive: shouldDeactivate ? false : reminder.isActive
          }
        }
      )
      .exec();
  }

  private resolveInterval(frequency: ReminderFrequency, intervalHours?: number) {
    if (frequency === ReminderFrequency.CUSTOM) {
      if (!intervalHours || intervalHours < 1) {
        throw new BadRequestException('intervalHours is required for CUSTOM frequency');
      }
      return { frequency, intervalHours };
    }

    if (frequency === ReminderFrequency.DAILY) {
      return { frequency, intervalHours: 24 };
    }

    if (frequency === ReminderFrequency.WEEKLY) {
      return { frequency, intervalHours: 24 * 7 };
    }

    return { frequency, intervalHours: 24 * 30 };
  }

  private computeNextRunAt(base: Date, intervalHours: number, now: Date) {
    let nextRunAt = new Date(base);
    const intervalMs = intervalHours * 60 * 60 * 1000;

    if (Number.isNaN(intervalMs) || intervalMs <= 0) {
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    while (nextRunAt <= now) {
      nextRunAt = new Date(nextRunAt.getTime() + intervalMs);
    }

    return nextRunAt;
  }
}
