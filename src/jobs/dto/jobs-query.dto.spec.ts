import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { JobsQueryDto } from './jobs-query.dto';

describe('JobsQueryDto', () => {
  const base = {
    role: 'backend' as const,
    seniority: 'senior' as const,
    location: ['Remote'],
  };

  it('coerces single string stack and location to string arrays', () => {
    const dto = plainToInstance(JobsQueryDto, {
      ...base,
      stack: 'react',
      location: 'Berlin',
    });
    expect(dto.stack).toEqual(['react']);
    expect(dto.location).toEqual(['Berlin']);
  });

  it('coerces array entries: strings, numbers, booleans, bigint', () => {
    const dto = plainToInstance(JobsQueryDto, {
      ...base,
      stack: ['python', 2, false, BigInt(3)],
      location: ['x'],
    });
    expect(dto.stack).toEqual(['python', '2', 'false', '3']);
  });

  it('drops non-primitive values instead of "[object Object]"', () => {
    const dto = plainToInstance(JobsQueryDto, {
      ...base,
      stack: [{}, 'rust', null, 'go'],
      location: ['y'],
    });
    expect(dto.stack).toEqual(['rust', 'go']);
  });

  it('returns undefined when stack has no coercible values', () => {
    const dto = plainToInstance(JobsQueryDto, {
      ...base,
      stack: [{}],
      location: ['y'],
    });
    expect(dto.stack).toBeUndefined();
  });

  it('returns undefined for null or undefined stack input', () => {
    expect(
      plainToInstance(JobsQueryDto, { ...base, stack: null, location: ['y'] })
        .stack,
    ).toBeUndefined();
    expect(
      plainToInstance(JobsQueryDto, {
        ...base,
        stack: undefined,
        location: ['y'],
      }).stack,
    ).toBeUndefined();
  });
});
