import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { AuthService } from './auth.service';
import { GitHubService, GitHubUserProfile } from './github.service';

describe('AuthService', () => {
  let service: AuthService;
  let githubService: {
    signOAuthState: jest.Mock;
    buildAuthorizeUrl: jest.Mock;
    verifyOAuthState: jest.Mock;
    exchangeCodeForToken: jest.Mock;
    fetchGitHubUser: jest.Mock;
    isActiveSponsor: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let userRepository: { findOneBy: jest.Mock; save: jest.Mock };

  const profile: GitHubUserProfile = {
    id: 42,
    login: 'active-sponsor',
    email: 'sponsor@example.com',
  };

  beforeEach(() => {
    githubService = {
      signOAuthState: jest.fn().mockResolvedValue('oauth-state'),
      buildAuthorizeUrl: jest.fn().mockReturnValue('https://github.com/login/oauth/authorize'),
      verifyOAuthState: jest.fn().mockResolvedValue(undefined),
      exchangeCodeForToken: jest.fn().mockResolvedValue('gho_access'),
      fetchGitHubUser: jest.fn().mockResolvedValue(profile),
      isActiveSponsor: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };
    userRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: profile.email,
        githubId: '42',
        githubLogin: profile.login,
      }),
    };
    service = new AuthService(
      githubService as unknown as GitHubService,
      jwtService as unknown as JwtService,
      userRepository as unknown as Repository<User>,
    );
  });

  it('startGitHubOAuth returns authorize URL', async () => {
    await expect(service.startGitHubOAuth()).resolves.toEqual({
      authorizeUrl: 'https://github.com/login/oauth/authorize',
    });
    expect(githubService.signOAuthState).toHaveBeenCalled();
  });

  it('handleGitHubCallback returns success for active sponsor', async () => {
    githubService.isActiveSponsor.mockResolvedValue(true);

    await expect(
      service.handleGitHubCallback('code-123', 'oauth-state'),
    ).resolves.toEqual({ kind: 'success', accessToken: 'jwt-token' });

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        githubId: '42',
        githubLogin: 'active-sponsor',
        email: 'sponsor@example.com',
      }),
    );
  });

  it('handleGitHubCallback returns not_sponsor when sponsorship inactive', async () => {
    githubService.isActiveSponsor.mockResolvedValue(false);

    await expect(
      service.handleGitHubCallback('code-123', 'oauth-state'),
    ).resolves.toEqual({ kind: 'not_sponsor' });
  });

  it('handleGitHubCallback returns auth_failed when code missing', async () => {
    await expect(
      service.handleGitHubCallback(undefined, 'oauth-state'),
    ).resolves.toEqual({ kind: 'auth_failed' });
  });
});
