import { IsIn } from 'class-validator';

import { TAXI_MARKETPLACE_STATUSES } from '../../taxi-drivers/dto/set-taxi-status.dto';

export class AdminSetTaxiStatusDto {
  @IsIn([...TAXI_MARKETPLACE_STATUSES, 'rejected', 'pending', 'approved'])
  status!: string;
}
