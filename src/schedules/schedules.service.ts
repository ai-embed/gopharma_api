import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PharmaciesService } from '../pharmacies/pharmacies.service';
import { CreateExceptionScheduleDto } from './dto/create-exception-schedule.dto';
import { UpdateWeeklyScheduleDto } from './dto/update-weekly-schedule.dto';
import { ExceptionSlot, Schedule, ScheduleDocument } from './schemas/schedule.schema';

interface PharmacyOpenStatus {
  openNow: boolean;
  source: 'manual' | 'schedule';
  nextTransitionAt?: string;
  matchedRule?: string;
}

@Injectable()
export class SchedulesService {
  constructor(
    @Inject(forwardRef(() => PharmaciesService))
    private readonly pharmaciesService: PharmaciesService,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>
  ) {}

  private async getOrCreateByManager(ownerUserId: string) {
    const pharmacy = await this.pharmaciesService.findByOwner(ownerUserId);

    let schedule = await this.scheduleModel
      .findOne({ pharmacyId: pharmacy._id })
      .exec();

    if (!schedule) {
      schedule = await this.scheduleModel.create({
        pharmacyId: pharmacy._id,
        weekly: [],
        exceptions: []
      });
    }

    return { pharmacy, schedule };
  }

  async getManagerSchedule(ownerUserId: string) {
    const { schedule } = await this.getOrCreateByManager(ownerUserId);
    return schedule;
  }

  async updateWeekly(ownerUserId: string, dto: UpdateWeeklyScheduleDto) {
    const { schedule } = await this.getOrCreateByManager(ownerUserId);
    schedule.weekly = dto.weekly;
    schedule.updatedBy = new Types.ObjectId(ownerUserId);
    await schedule.save();
    return schedule;
  }

  async addException(ownerUserId: string, dto: CreateExceptionScheduleDto) {
    const { schedule } = await this.getOrCreateByManager(ownerUserId);

    schedule.exceptions.push({
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isClosed: dto.isClosed,
      onDuty: dto.onDuty,
      openTime: dto.openTime,
      closeTime: dto.closeTime,
      label: dto.label
    });
    schedule.updatedBy = new Types.ObjectId(ownerUserId);
    await schedule.save();
    return schedule;
  }

  async removeException(ownerUserId: string, index: number) {
    const { schedule } = await this.getOrCreateByManager(ownerUserId);
    schedule.exceptions.splice(index, 1);
    schedule.updatedBy = new Types.ObjectId(ownerUserId);
    await schedule.save();
    return { success: true };
  }

  async getByPharmacyId(pharmacyId: string) {
    return this.scheduleModel
      .findOne({ pharmacyId: new Types.ObjectId(pharmacyId) })
      .exec();
  }

  async getRequiredByPharmacyId(pharmacyId: string) {
    const schedule = await this.getByPharmacyId(pharmacyId);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  evaluateSchedule(
    schedule: Pick<Schedule, 'weekly' | 'exceptions'> | null | undefined,
    now: Date = new Date()
  ): PharmacyOpenStatus {
    if (!schedule) {
      return {
        openNow: false,
        source: 'manual'
      };
    }

    const exception = this.findMatchingException(schedule.exceptions, now);
    if (exception) {
      const openNow = this.isWindowOpen(
        exception.openTime,
        exception.closeTime,
        now,
        exception.isClosed
      );
      return {
        openNow,
        source: 'schedule',
        nextTransitionAt: openNow
          ? this.computeClosingTransition(now, exception.openTime, exception.closeTime)
          : undefined,
        matchedRule: exception.label ?? 'exception'
      };
    }

    const day = now.getUTCDay();
    const weekly = schedule.weekly.find((slot) => slot.dayOfWeek === day);

    if (!weekly) {
      return {
        openNow: false,
        source: 'schedule',
        matchedRule: 'no-weekly-slot'
      };
    }

    const openNow = this.isWindowOpen(weekly.openTime, weekly.closeTime, now, weekly.isClosed);
    return {
      openNow,
      source: 'schedule',
      nextTransitionAt: openNow
        ? this.computeClosingTransition(now, weekly.openTime, weekly.closeTime)
        : undefined,
      matchedRule: `weekly-${day}`
    };
  }

  async getOpenStatusForPharmacy(
    pharmacyId: string,
    now: Date = new Date()
  ): Promise<PharmacyOpenStatus> {
    const schedule = await this.getByPharmacyId(pharmacyId);
    return this.evaluateSchedule(schedule, now);
  }

  async getOpenStatusMap(
    pharmacyIds: string[],
    now: Date = new Date()
  ): Promise<Map<string, PharmacyOpenStatus>> {
    if (pharmacyIds.length === 0) {
      return new Map();
    }

    const ids = pharmacyIds.map((id) => new Types.ObjectId(id));
    const schedules = await this.scheduleModel.find({ pharmacyId: { $in: ids } }).exec();
    const byPharmacyId = new Map(
      schedules.map((schedule) => [
        schedule.pharmacyId.toString(),
        this.evaluateSchedule(schedule, now)
      ])
    );

    return byPharmacyId;
  }

  private findMatchingException(exceptions: ExceptionSlot[], now: Date) {
    return exceptions.find((item) => {
      const start = new Date(item.startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(item.endDate);
      end.setUTCHours(23, 59, 59, 999);
      return now >= start && now <= end;
    });
  }

  private isWindowOpen(
    openTime: string | undefined,
    closeTime: string | undefined,
    now: Date,
    isClosed: boolean
  ) {
    if (isClosed || !openTime || !closeTime) {
      return false;
    }

    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const openMinutes = this.parseTime(openTime);
    const closeMinutes = this.parseTime(closeTime);

    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  private parseTime(value: string) {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) {
      return 0;
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  private computeClosingTransition(
    now: Date,
    openTime?: string,
    closeTime?: string
  ) {
    if (!openTime || !closeTime) {
      return undefined;
    }

    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const openMinutes = this.parseTime(openTime);
    const closeMinutes = this.parseTime(closeTime);

    const closeDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    closeDate.setUTCMinutes(closeMinutes, 0, 0);

    if (closeMinutes < openMinutes && currentMinutes >= openMinutes) {
      closeDate.setUTCDate(closeDate.getUTCDate() + 1);
    }

    return closeDate.toISOString();
  }
}
