import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from './audit/audit.module';
import { LocalizationModule } from './common/localization/localization.module';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PharmaciesModule } from './pharmacies/pharmacies.module';
import { CatalogModule } from './catalog/catalog.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SearchModule } from './search/search.module';
import { HistoryModule } from './history/history.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AssistantModule } from './assistant/assistant.module';
import { AdminModule } from './admin/admin.module';
import { FilesModule } from './files/files.module';
import { ManagerModule } from './manager/manager.module';
import { SystemModule } from './system/system.module';
import { RemindersModule } from './reminders/reminders.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { PublicDrugsModule } from './public-drugs/public-drugs.module';
import { DirectionsModule } from './directions/directions.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    LocalizationModule,
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI
      })
    }),
    AuthModule,
    UsersModule,
    PharmaciesModule,
    CatalogModule,
    SchedulesModule,
    SearchModule,
    HistoryModule,
    FavoritesModule,
    NotificationsModule,
    AssistantModule,
    RemindersModule,
    PublicDrugsModule,
    DirectionsModule,
    AdminModule,
    FilesModule,
    ManagerModule,
    SystemModule,
    AuditModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
