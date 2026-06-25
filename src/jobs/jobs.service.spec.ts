import { SourceProvider } from '../database/entities/source.entity';
import { JobsService } from './jobs.service';

describe('JobsService.reconcileStaleJobsForSource', () => {
  let service: JobsService;
  let deleteQb: {
    where: jest.Mock;
    andWhere: jest.Mock;
    execute: jest.Mock;
  };
  let createQueryBuilder: jest.Mock;

  beforeEach(() => {
    deleteQb = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    createQueryBuilder = jest.fn().mockReturnValue(deleteQb);

    const jobsRepository = {
      createQueryBuilder,
    };

    service = new JobsService(
      {} as never,
      jobsRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {},
    );
  });

  it('deletes jobs not in fetched set scoped by provider and company', async () => {
    const removed = await service.reconcileStaleJobsForSource(
      { provider: SourceProvider.GREENHOUSE, name: 'Acme' },
      [{ externalId: '1' }, { externalId: '2' }],
    );

    expect(createQueryBuilder).toHaveBeenCalled();
    expect(deleteQb.where).toHaveBeenCalledWith('provider = :provider', {
      provider: SourceProvider.GREENHOUSE,
    });
    expect(deleteQb.andWhere).toHaveBeenCalledWith('company = :company', {
      company: 'Acme',
    });
    expect(deleteQb.andWhere).toHaveBeenCalledWith(
      'externalId NOT IN (:...fetchedExternalIds)',
      { fetchedExternalIds: ['1', '2'] },
    );
    expect(removed).toBe(2);
  });

  it('deletes all jobs for source when fetch returns empty list', async () => {
    deleteQb.execute.mockResolvedValue({ affected: 5 });

    const removed = await service.reconcileStaleJobsForSource(
      { provider: SourceProvider.ASHBY, name: 'Empty Co' },
      [],
    );

    expect(deleteQb.where).toHaveBeenCalledWith('provider = :provider', {
      provider: SourceProvider.ASHBY,
    });
    expect(deleteQb.andWhere).toHaveBeenCalledWith('company = :company', {
      company: 'Empty Co',
    });
    expect(deleteQb.andWhere).not.toHaveBeenCalledWith(
      'externalId NOT IN (:...fetchedExternalIds)',
      expect.anything(),
    );
    expect(removed).toBe(5);
  });

  it('deduplicates fetched external ids', async () => {
    await service.reconcileStaleJobsForSource(
      { provider: SourceProvider.WORKABLE, name: 'Co' },
      [{ externalId: 'a' }, { externalId: 'a' }],
    );

    expect(deleteQb.andWhere).toHaveBeenCalledWith(
      'externalId NOT IN (:...fetchedExternalIds)',
      { fetchedExternalIds: ['a'] },
    );
  });
});
