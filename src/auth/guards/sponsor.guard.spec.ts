import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GitHubService } from '../github.service';
import { SponsorGuard } from './sponsor.guard';

describe('SponsorGuard', () => {
  let guard: SponsorGuard;
  let githubService: { isActiveSponsor: jest.Mock };

  function createContext(githubLogin?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: githubLogin ? { userId: 'user-1', githubLogin } : { userId: 'user-1' },
        }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    githubService = {
      isActiveSponsor: jest.fn(),
    };
    guard = new SponsorGuard(githubService as unknown as GitHubService);
  });

  it('allows request when sponsorship is active', async () => {
    githubService.isActiveSponsor.mockResolvedValue(true);
    await expect(guard.canActivate(createContext('active-sponsor'))).resolves.toBe(
      true,
    );
  });

  it('throws sponsorship_required when sponsorship is inactive', async () => {
    githubService.isActiveSponsor.mockResolvedValue(false);
    await expect(guard.canActivate(createContext('former-sponsor'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      guard.canActivate(createContext('former-sponsor')),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'sponsorship_required',
      }),
    });
  });

  it('throws sponsorship_required when githubLogin missing from JWT', async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
