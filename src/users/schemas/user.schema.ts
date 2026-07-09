import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  AccountStatus,
  NotificationChannel,
  Role,
  SupportedLanguage,
  ThemePreference
} from 'src/common/enums/domain.enums';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ required: true, enum: SupportedLanguage, default: SupportedLanguage.FR })
  language!: SupportedLanguage;

  @Prop({ required: true, default: 'UTC' })
  timezone!: string;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
  })
  channels!: NotificationChannel[];

  @Prop({ required: true, default: true })
  alertsEnabled!: boolean;

  @Prop({ required: true, enum: ThemePreference, default: ThemePreference.LIGHT })
  theme!: ThemePreference;
}

@Schema({
  timestamps: true,
  collection: 'users'
})
export class User {
  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: false, unique: true, sparse: true })
  googleId?: string;

  @Prop({ required: true, enum: Role })
  role!: Role;

  @Prop({ required: true, enum: AccountStatus, default: AccountStatus.EN_ATTENTE })
  accountStatus!: AccountStatus;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ required: true })
  country!: string;

  @Prop({ required: false, trim: true })
  phoneNumber?: string;

  @Prop({ type: Date, default: null })
  emailVerifiedAt?: Date | null;

  @Prop({ type: UserPreferences, default: {} })
  preferences!: UserPreferences;

  @Prop({ required: false })
  profilePhotoUrl?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
