import { Job } from '../../database/entities/job.entity';
import { SourceProvider } from '../../database/entities/source.entity';
import {
  FULLY_REMOTE_LOCATION,
  isFullyRemoteJob,
  matchesJobLocationPreset,
  REMOTE_LOCATION,
} from './match-location-preset';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'greenhouse:1',
    externalId: '1',
    provider: SourceProvider.GREENHOUSE,
    title: 'Engineer',
    company: 'Acme',
    location: 'Remote',
    locationRaw: 'Remote',
    locationTokens: [],
    locationCountries: [],
    locationRegions: [],
    isRemote: true,
    role: 'backend',
    stack: [],
    seniorities: [],
    postedAt: new Date(),
    url: 'https://example.com',
    hash: 'hash',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('isFullyRemoteJob', () => {
  it('returns true for plain Remote with isRemote and no geo', () => {
    expect(isFullyRemoteJob(makeJob())).toBe(true);
  });

  it('returns false when isRemote is false', () => {
    expect(isFullyRemoteJob(makeJob({ isRemote: false }))).toBe(false);
  });

  it('returns false when location is not plain Remote', () => {
    expect(
      isFullyRemoteJob(
        makeJob({ location: 'Remote, United States', isRemote: true }),
      ),
    ).toBe(false);
  });

  it('returns false when locationCountries are set', () => {
    expect(
      isFullyRemoteJob(makeJob({ locationCountries: ['united states'] })),
    ).toBe(false);
  });

  it('returns false when raw text mentions hybrid', () => {
    expect(
      isFullyRemoteJob(
        makeJob({ locationRaw: 'Hybrid - Remote, San Francisco' }),
      ),
    ).toBe(false);
  });

  it('returns false when title has geo-scoped remote like US Remote', () => {
    expect(
      isFullyRemoteJob(
        makeJob({
          title: 'Senior Full Stack Engineer – EHR Integrations - US Remote',
        }),
      ),
    ).toBe(false);
  });

  it('returns false when locationCountries were set from geo-scoped title', () => {
    expect(
      isFullyRemoteJob(
        makeJob({
          title: 'Engineer - US Remote',
          locationCountries: ['united states'],
        }),
      ),
    ).toBe(false);
  });
});

describe('matchesJobLocationPreset', () => {
  it('matches fully-remote-only preset for fully remote jobs', () => {
    expect(matchesJobLocationPreset(makeJob(), [FULLY_REMOTE_LOCATION])).toBe(
      true,
    );
  });

  it('does not match fully-remote-only for broad remote with geo', () => {
    expect(
      matchesJobLocationPreset(
        makeJob({
          location: 'Remote, United States',
          locationCountries: ['united states'],
        }),
        [FULLY_REMOTE_LOCATION],
      ),
    ).toBe(false);
  });

  it('matches remote-only preset for any isRemote job', () => {
    expect(
      matchesJobLocationPreset(
        makeJob({
          location: 'Remote, United States',
          locationCountries: ['united states'],
        }),
        [REMOTE_LOCATION],
      ),
    ).toBe(true);
  });

  it('includes fully remote jobs when countries and fully-remote are selected', () => {
    const usJob = makeJob({
      location: 'United States',
      locationRaw: 'United States',
      locationCountries: ['united states'],
      isRemote: false,
    });
    const fullyRemote = makeJob();

    expect(
      matchesJobLocationPreset(usJob, ['united states', FULLY_REMOTE_LOCATION]),
    ).toBe(true);
    expect(
      matchesJobLocationPreset(fullyRemote, [
        'united states',
        FULLY_REMOTE_LOCATION,
      ]),
    ).toBe(true);
  });

  it('uses broad isRemote when both remote tokens are selected without countries', () => {
    const hybridRemote = makeJob({
      location: 'San Francisco',
      locationRaw: 'Hybrid remote',
      isRemote: true,
    });
    expect(
      matchesJobLocationPreset(hybridRemote, [
        REMOTE_LOCATION,
        FULLY_REMOTE_LOCATION,
      ]),
    ).toBe(true);
  });
});
