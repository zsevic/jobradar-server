import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
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
  'react native',
  'swift',
  'kotlin',
  'flutter',
  'dart',
] as const;

const seniorityOptions = ['intern', 'junior', 'mid', 'senior', 'staff'] as const;

const noStackRoles = [
  'devops',
  'qa',
  'management',
  'ai',
  'data',
  'solutions',
  'recruiter',
  'security',
] as const;

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

export class JobsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  /** When set, all filter fields below are validated and used as feed overrides. */
  @IsOptional()
  @IsIn(roles as unknown as string[])
  role?: (typeof roles)[number];

  @ValidateIf(
    (o: JobsQueryDto) =>
      !!o.role && !noStackRoles.includes(o.role as (typeof noStackRoles)[number]),
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(stackOptions, { each: true })
  @Transform(({ value }) => toStringArray(value))
  stack?: Array<(typeof stackOptions)[number]>;

  /** Single seniority filter (user selects one level). */
  @ValidateIf((o: JobsQueryDto) => !!o.role)
  @IsIn(seniorityOptions as unknown as string[])
  seniority?: (typeof seniorityOptions)[number];

  @ValidateIf((o: JobsQueryDto) => !!o.role)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Transform(({ value }) => toStringArray(value))
  location?: string[];

  @ValidateIf((o: JobsQueryDto) => !!o.role)
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true' || value === '1') {
      return true;
    }
    if (value === 'false' || value === '0') {
      return false;
    }
    return value;
  })
  alertsEnabled?: boolean;
}
