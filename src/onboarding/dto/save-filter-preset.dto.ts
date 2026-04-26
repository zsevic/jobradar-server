import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateIf,
} from 'class-validator';

const roles = [
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'devops',
  'qa',
] as const;
const stackOptions = [
  'node.js',
  'python',
  'golang',
  'java',
  '.net',
  'php',
  'react',
  'angular',
  'vue',
  'next.js',
  'nuxt',
  'svelte',
  'react native',
  'swift',
  'kotlin',
  'flutter',
  'dart',
] as const;
const seniorityOptions = ['junior', 'mid', 'senior', 'staff'] as const;
const locationOptions = ['remote', 'EU', 'US'] as const;

export class SaveFilterPresetDto {
  @IsIn(roles)
  role!: (typeof roles)[number];

  @ValidateIf((o: SaveFilterPresetDto) => !['devops', 'qa'].includes(o.role))
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
