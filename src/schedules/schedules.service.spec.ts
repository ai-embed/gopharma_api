import { SchedulesService } from './schedules.service';

describe('SchedulesService', () => {
  const service = new SchedulesService(
    {} as never,
    {} as never
  );

  it('marks a weekly slot as open when current time is inside the range', () => {
    const result = service.evaluateSchedule(
      {
        weekly: [
          {
            dayOfWeek: 1,
            openTime: '08:00',
            closeTime: '18:00',
            isClosed: false,
            onDuty: false
          }
        ],
        exceptions: []
      },
      new Date('2026-03-02T10:30:00Z')
    );

    expect(result.openNow).toBe(true);
    expect(result.source).toBe('schedule');
  });

  it('uses exception slot over weekly slot', () => {
    const result = service.evaluateSchedule(
      {
        weekly: [
          {
            dayOfWeek: 1,
            openTime: '08:00',
            closeTime: '18:00',
            isClosed: false,
            onDuty: false
          }
        ],
        exceptions: [
          {
            startDate: new Date('2026-03-02T00:00:00Z'),
            endDate: new Date('2026-03-02T23:59:59Z'),
            isClosed: true,
            onDuty: false,
            label: 'holiday'
          }
        ]
      },
      new Date('2026-03-02T10:30:00Z')
    );

    expect(result.openNow).toBe(false);
    expect(result.matchedRule).toBe('holiday');
  });

  it('supports overnight opening windows', () => {
    const result = service.evaluateSchedule(
      {
        weekly: [
          {
            dayOfWeek: 5,
            openTime: '20:00',
            closeTime: '02:00',
            isClosed: false,
            onDuty: true
          }
        ],
        exceptions: []
      },
      new Date('2026-03-06T23:30:00Z')
    );

    expect(result.openNow).toBe(true);
  });
});
