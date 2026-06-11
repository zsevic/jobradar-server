import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { of, throwError } from 'rxjs';
import { GitHubService } from './github.service';

describe('GitHubService', () => {
  let service: GitHubService;
  let httpService: { post: jest.Mock; get: jest.Mock };
  let configService: { get: jest.Mock };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          GITHUB_CLIENT_ID: 'client-id',
          GITHUB_CLIENT_SECRET: 'client-secret',
          GITHUB_SPONSOR_LOGIN: 'zsevic',
          GITHUB_SPONSOR_CHECK_TOKEN: 'pat-token',
          BACKEND_ORIGIN: 'http://localhost:3000',
          REDIS_URL: '',
          SPONSOR_CHECK_CACHE_TTL_SECONDS: '300',
        };
        return values[key];
      }),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-state'),
      verifyAsync: jest.fn().mockResolvedValue({ purpose: 'github-oauth-state' }),
    };
    service = new GitHubService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
      jwtService as unknown as JwtService,
    );
  });

  it('builds authorize URL with state', () => {
    const url = service.buildAuthorizeUrl('state-123');
    expect(url).toContain('github.com/login/oauth/authorize');
    expect(url).toContain('client_id=client-id');
    expect(url).toContain('state=state-123');
  });

  it('grants access to the sponsor account owner without calling GitHub', async () => {
    await expect(service.isActiveSponsor('zsevic')).resolves.toBe(true);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('returns true when user is in sponsors list for required tier', async () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GITHUB_CLIENT_ID: 'client-id',
        GITHUB_CLIENT_SECRET: 'client-secret',
        GITHUB_SPONSOR_LOGIN: 'zsevic',
        GITHUB_SPONSOR_CHECK_TOKEN: 'pat-token',
        GITHUB_SPONSOR_REQUIRED_TIER_ID: 'ST_tier_123',
        BACKEND_ORIGIN: 'http://localhost:3000',
        REDIS_URL: '',
        SPONSOR_CHECK_CACHE_TTL_SECONDS: '300',
      };
      return values[key];
    });
    httpService.post.mockReturnValue(
      of({
        data: {
          data: {
            user: {
              sponsors: {
                pageInfo: { hasNextPage: false },
                nodes: [{ login: 'sponsor-user' }],
              },
            },
          },
        },
      }),
    );

    await expect(service.isActiveSponsor('sponsor-user')).resolves.toBe(true);
  });

  it('returns false when user is not in sponsors list for required tier', async () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GITHUB_CLIENT_ID: 'client-id',
        GITHUB_CLIENT_SECRET: 'client-secret',
        GITHUB_SPONSOR_LOGIN: 'zsevic',
        GITHUB_SPONSOR_CHECK_TOKEN: 'pat-token',
        GITHUB_SPONSOR_REQUIRED_TIER_ID: 'ST_tier_123',
        BACKEND_ORIGIN: 'http://localhost:3000',
        REDIS_URL: '',
        SPONSOR_CHECK_CACHE_TTL_SECONDS: '300',
      };
      return values[key];
    });
    httpService.post.mockReturnValue(
      of({
        data: {
          data: {
            user: {
              sponsors: {
                pageInfo: { hasNextPage: false },
                nodes: [{ login: 'other-user' }],
              },
            },
          },
        },
      }),
    );

    await expect(service.isActiveSponsor('sponsor-user')).resolves.toBe(false);
  });

  it('returns true when GraphQL reports active sponsorship', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          data: { user: { isSponsoredBy: true } },
        },
      }),
    );

    await expect(service.isActiveSponsor('sponsor-user')).resolves.toBe(true);
  });

  it('returns false when GraphQL reports inactive sponsorship', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          data: { user: { isSponsoredBy: false } },
        },
      }),
    );

    await expect(service.isActiveSponsor('former-sponsor')).resolves.toBe(false);
  });

  it('verifySponsorshipForUser returns not_sponsor when inactive', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          data: { user: { isSponsoredBy: false } },
        },
      }),
    );

    await expect(
      service.verifySponsorshipForUser({ githubLogin: 'former-sponsor' }),
    ).resolves.toEqual({ ok: false, reason: 'not_sponsor' });
  });

  it('verifySponsorshipForUser returns no_github_login when missing login', async () => {
    await expect(
      service.verifySponsorshipForUser({ githubLogin: null }),
    ).resolves.toEqual({ ok: false, reason: 'no_github_login' });
  });

  it('exchangeCodeForToken returns access token from GitHub', async () => {
    httpService.post.mockReturnValue(
      of({ data: { access_token: 'gho_test_token' } }),
    );

    await expect(service.exchangeCodeForToken('oauth-code')).resolves.toBe(
      'gho_test_token',
    );
  });

  it('isActiveSponsor returns false on GraphQL HTTP failure', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('network')));

    await expect(
      service.verifySponsorshipForUser({ githubLogin: 'any-user' }),
    ).resolves.toEqual({ ok: false, reason: 'http' });
  });
});
