import { AccountStatus, Role } from '../enums/domain.enums';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
}
