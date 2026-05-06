import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  ValidateIf,
} from 'class-validator';

const roles = [
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'devops',
  'qa',
  'management',
  'engineer',
  'ai',
  'data',
  'solutions',
  'recruiter',
  'security',
  'designer',
] as const;
const stackOptions = [
  'node.js',
  'python',
  'golang',
  'rust',
  'java',
  '.net',
  'php',
  'react',
  'angular',
  'vue',
  'next.js',
  'nuxt',
  'svelte',
  'typescript',
  'javascript',
  'react native',
  'swift',
  'kotlin',
  'flutter',
  'dart',
] as const;
const seniorityOptions = ['intern', 'junior', 'mid', 'senior', 'staff'] as const;
export class SaveFilterPresetDto {
  @IsIn(roles)
  role!: (typeof roles)[number];

  @ValidateIf((o: SaveFilterPresetDto) =>
    ![
      'devops',
      'qa',
      'management',
      'ai',
      'data',
      'solutions',
      'recruiter',
      'security',
      'designer',
    ].includes(o.role),
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(stackOptions, { each: true })
  stack!: Array<(typeof stackOptions)[number]>;

  @IsIn(seniorityOptions)
  seniority!: (typeof seniorityOptions)[number];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  locations!: string[];

  @IsBoolean()
  alertsEnabled!: boolean;
}
