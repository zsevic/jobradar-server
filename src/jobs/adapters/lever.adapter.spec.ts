import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SourceProvider } from '../../database/entities/source.entity';
import { LeverAdapter } from './lever.adapter';

function unlimitEngineeringPosting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    text: 'Senior Software Engineer',
    hostedUrl: 'https://jobs.lever.co/unlimit/a1b2c3d4',
    applyUrl: 'https://jobs.lever.co/unlimit/a1b2c3d4/apply',
    createdAt: 1_704_067_200_000,
    country: 'RS',
    workplaceType: 'onsite',
    categories: {
      location: 'Belgrade, Serbia',
      allLocations: ['Belgrade, Serbia', 'Limassol, Cyprus'],
      team: 'Engineering',
      commitment: 'Full-time',
    },
    descriptionPlain:
      'Build payment infrastructure. Experience with TypeScript and Node.js required.',
    lists: [
      {
        text: 'Requirements',
        content: '<ul><li>5+ years backend development</li></ul>',
      },
    ],
    ...overrides,
  };
}

describe('LeverAdapter', () => {
  let adapter: LeverAdapter;
  let httpGet: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeverAdapter,
        {
          provide: HttpService,
          useValue: { get: httpGet },
        },
      ],
    }).compile();

    adapter = module.get(LeverAdapter);
  });

  it('maps onsite posting with multi-city locations and engineering stack', async () => {
    httpGet.mockReturnValue(of({ data: [unlimitEngineeringPosting()] }));

    const jobs = await adapter.fetchJobs('unlimit', 'Unlimit');

    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.provider).toBe(SourceProvider.LEVER);
    expect(job.externalId).toBe('a1b2c3d4-0000-4000-8000-000000000001');
    expect(job.title).toContain('Senior Software Engineer');
    expect(job.url).toBe('https://jobs.lever.co/unlimit/a1b2c3d4');
    expect(job.locationRaw).toContain('Belgrade');
    expect(job.locationRaw).toContain('Limassol');
    expect(job.locationCountryHints).toEqual(['RS']);
    expect(job.remoteIndicatedByProvider).toBe(false);
    expect(job.isRemote).toBe(false);
    expect(job.postedAt).toEqual(new Date(1_704_067_200_000));
    expect(job.role).toBe('engineer');
    expect(job.stack.length).toBeGreaterThan(0);
  });

  it('sets remoteIndicatedByProvider only for remote workplaceType', async () => {
    httpGet.mockReturnValue(
      of({
        data: [
          unlimitEngineeringPosting({
            id: 'remote-1',
            workplaceType: 'remote',
            categories: { location: 'Remote' },
          }),
          unlimitEngineeringPosting({
            id: 'hybrid-1',
            workplaceType: 'hybrid',
            categories: { location: 'San Francisco, CA' },
            country: 'US',
          }),
        ],
      }),
    );

    const jobs = await adapter.fetchJobs('unlimit', 'Unlimit');
    const remote = jobs.find((j) => j.externalId === 'remote-1');
    const hybrid = jobs.find((j) => j.externalId === 'hybrid-1');

    expect(remote?.remoteIndicatedByProvider).toBe(true);
    expect(remote?.isRemote).toBe(true);
    expect(hybrid?.remoteIndicatedByProvider).toBe(false);
    expect(hybrid?.isRemote).toBe(false);
  });

  it('paginates until a page returns fewer than limit rows', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) =>
      unlimitEngineeringPosting({
        id: `page1-${i}`,
        text: `Engineer ${i}`,
      }),
    );
    const page2 = [
      unlimitEngineeringPosting({
        id: 'page2-0',
        text: 'Engineer last',
      }),
    ];

    httpGet.mockImplementation(
      (_url: string, config: { params?: { skip?: number } }) => {
        const skip = config?.params?.skip ?? 0;
        if (skip === 0) {
          return of({ data: page1 });
        }
        if (skip === 100) {
          return of({ data: page2 });
        }
        return of({ data: [] });
      },
    );

    const jobs = await adapter.fetchJobs('unlimit', 'Unlimit');

    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(101);
  });

  it('uses EU postings API host when apiRegion is eu', async () => {
    httpGet.mockReturnValue(
      of({
        data: [
          {
            id: 'sym-1',
            text: 'Backend Engineer',
            hostedUrl: 'https://jobs.eu.lever.co/symphony/sym-1',
          },
        ],
      }),
    );

    await adapter.fetchJobs('symphony', 'Symphony', 'eu');

    expect(httpGet).toHaveBeenCalledWith(
      'https://api.eu.lever.co/v0/postings/symphony',
      expect.objectContaining({
        params: expect.objectContaining({ mode: 'json', skip: 0, limit: 100 }),
      }),
    );
  });

  it('skips postings without title or url', async () => {
    httpGet.mockReturnValue(
      of({
        data: [
          unlimitEngineeringPosting({ text: '', hostedUrl: '', applyUrl: '' }),
          unlimitEngineeringPosting({ text: 'Valid', hostedUrl: 'https://x' }),
        ],
      }),
    );

    const jobs = await adapter.fetchJobs('unlimit', 'Unlimit');

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toContain('Valid');
  });
});
