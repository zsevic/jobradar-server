import { ArrayMinSize, IsArray, IsBoolean, IsIn } from 'class-validator';

const roles = ['backend', 'frontend', 'devops', 'qa'] as const;
const stackOptions = ['node.js', 'python', 'golang'] as const;
const seniorityOptions = ['junior', 'mid', 'senior', 'staff'] as const;
const locationOptions = ['remote', 'EU', 'US'] as const;

export class SaveFilterPresetDto {
  @IsIn(roles)
  role!: (typeof roles)[number];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(stackOptions, { each: true })
  stack!: Array<(typeof stackOptions)[number]>;

  @IsIn(seniorityOptions)
  seniority!: (typeof seniorityOptions)[number];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(locationOptions, { each: true })
  locations!: Array<(typeof locationOptions)[number]>;

  @IsBoolean()
  alertsEnabled!: boolean;
}
