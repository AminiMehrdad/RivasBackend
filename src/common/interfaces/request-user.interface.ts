import { UserRole } from '../../database/entities/user.entity';

export interface RequestUser {
  userId: string;
  role: UserRole;
}
