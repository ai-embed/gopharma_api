import { NotificationChannel, NotificationType, SupportedLanguage } from '../common/enums/domain.enums';
import { LocalizationService } from '../common/localization/localization.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const buildService = (language: SupportedLanguage) => {
    const notificationModel = {
      create: jest.fn(async (payload) => payload)
    };
    const usersService = {
      findById: jest.fn(async () => ({
        _id: '507f1f77bcf86cd799439011',
        email: 'user@test.local',
        preferences: {
          language,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
        }
      }))
    };
    const mailerService = {
      sendMail: jest.fn(async () => undefined)
    };

    return {
      service: new NotificationsService(
        notificationModel as never,
        usersService as never,
        mailerService as never,
        new LocalizationService(),
        { send: jest.fn(async () => undefined) }
      ),
      notificationModel,
      mailerService
    };
  };

  it('stores and emails french content', async () => {
    const { service, notificationModel, mailerService } = buildService(SupportedLanguage.FR);

    await service.notifyUser('507f1f77bcf86cd799439011', NotificationType.SUSPENSION, {
      titleKey: 'notification.accountSuspended.title',
      messageKey: 'notification.accountSuspended.message',
      params: { reason: 'Documents manquants' }
    });

    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Compte suspendu',
        message: 'Votre compte est suspendu. Raison: Documents manquants'
      })
    );
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      'user@test.local',
      'Compte suspendu',
      'Votre compte est suspendu. Raison: Documents manquants'
    );
  });

  it('stores and emails english content', async () => {
    const { service, notificationModel, mailerService } = buildService(SupportedLanguage.EN);

    await service.notifyUser('507f1f77bcf86cd799439011', NotificationType.SUSPENSION, {
      titleKey: 'notification.accountSuspended.title',
      messageKey: 'notification.accountSuspended.message',
      params: { reason: 'Missing documents' }
    });

    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Account suspended',
        message: 'Your account has been suspended. Reason: Missing documents'
      })
    );
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      'user@test.local',
      'Account suspended',
      'Your account has been suspended. Reason: Missing documents'
    );
  });

  it('sends push notifications when channel is enabled', async () => {
    const notificationModel = {
      create: jest.fn(async (payload) => payload)
    };
    const pushSender = {
      send: jest.fn(async () => undefined)
    };
    const usersService = {
      findById: jest.fn(async () => ({
        _id: '507f1f77bcf86cd799439011',
        email: 'user@test.local',
        preferences: {
          language: SupportedLanguage.FR,
          channels: [NotificationChannel.PUSH]
        }
      }))
    };
    const mailerService = {
      sendMail: jest.fn(async () => undefined)
    };

    const service = new NotificationsService(
      notificationModel as never,
      usersService as never,
      mailerService as never,
      new LocalizationService(),
      pushSender
    );

    await service.notifyUser('507f1f77bcf86cd799439011', NotificationType.SUSPENSION, {
      titleKey: 'notification.accountSuspended.title',
      messageKey: 'notification.accountSuspended.message',
      params: { reason: 'Documents manquants' }
    });

    expect(pushSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '507f1f77bcf86cd799439011',
        title: 'Compte suspendu'
      })
    );
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });
});
