import { IsBoolean } from 'class-validator';

export class UpdateAlertsDto {
  @IsBoolean()
  alertsEnabled!: boolean;
}
