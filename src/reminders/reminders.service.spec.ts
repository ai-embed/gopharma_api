import { Types } from 'mongoose';
import { NotificationType, ReminderFrequency } from '../common/enums/domain.enums';
import { RemindersService } from './reminders.service';
import { PrescriptionReminderDocument } from './schemas/prescription-reminder.schema';

describe('RemindersService (cron processing)', () => {
  const buildService = (reminders: PrescriptionReminderDocument[]) => {
    const reminderModel = {
      find: jest.fn(() => ({
        limit: jest.fn(() => ({
          exec: jest.fn(async () => reminders)
        }))
      })),
      updateOne: jest.fn(() => ({
        exec: jest.fn(async () => ({ acknowledged: true }))
      }))
    };

    const notificationsService = {
      notifyUser: jest.fn(async () => ({}))
    };

    const service = new RemindersService(
      reminderModel as never,
      notificationsService as never
    );

    return { service, reminderModel, notificationsService };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('triggers reminders and deactivates when next run exceeds endDate', async () => {
    const now = new Date('2026-03-11T10:00:00.000Z');
    jest.setSystemTime(now);

    const reminder = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      medicationName: 'Paracetamol 500mg',
      note: 'Apres repas',
      frequency: ReminderFrequency.DAILY,
      intervalHours: 24,
      startDate: new Date('2026-03-01T08:00:00.000Z'),
      endDate: new Date('2026-03-11T11:00:00.000Z'),
      nextRunAt: new Date('2026-03-11T09:00:00.000Z'),
      lastSentAt: undefined,
      isActive: true
    } as unknown as PrescriptionReminderDocument;

    const { service, reminderModel, notificationsService } = buildService([reminder]);

    await service.processDueReminders();

    expect(notificationsService.notifyUser).toHaveBeenCalledWith(
      reminder.userId.toString(),
      NotificationType.RAPPEL_ORDONNANCE,
      expect.objectContaining({
        titleKey: 'notification.prescriptionReminder.title',
        messageKey: 'notification.prescriptionReminder.message'
      }),
      expect.objectContaining({
        reminderId: reminder._id.toString(),
        medicationName: reminder.medicationName
      })
    );

    expect(reminderModel.updateOne).toHaveBeenCalledWith(
      { _id: reminder._id, nextRunAt: reminder.nextRunAt },
      expect.objectContaining({
        $set: expect.objectContaining({
          lastSentAt: now,
          isActive: false
        })
      })
    );
  });

  it('keeps reminders active when endDate is not reached', async () => {
    const now = new Date('2026-03-11T10:00:00.000Z');
    jest.setSystemTime(now);

    const reminder = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      medicationName: 'Ibuprofene 400mg',
      frequency: ReminderFrequency.DAILY,
      intervalHours: 24,
      startDate: new Date('2026-03-01T08:00:00.000Z'),
      endDate: new Date('2026-03-20T08:00:00.000Z'),
      nextRunAt: new Date('2026-03-11T09:00:00.000Z'),
      lastSentAt: undefined,
      isActive: true
    } as unknown as PrescriptionReminderDocument;

    const { service, reminderModel } = buildService([reminder]);

    await service.processDueReminders();

    const updateCall = reminderModel.updateOne as jest.Mock;
    const payload = updateCall.mock.calls[0]?.[1]?.$set;

    expect(payload?.isActive).toBe(true);
    expect(payload?.lastSentAt).toEqual(now);
  });
});
