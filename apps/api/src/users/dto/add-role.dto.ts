import { RoleType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AddRoleDto {
  @IsEnum(RoleType)
  role!: RoleType;
}
