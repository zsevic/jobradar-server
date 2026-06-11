import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { GitHubService } from './github.service';

export type GitHubCallbackResult =
  | { kind: 'success'; accessToken: string }
  | { kind: 'not_sponsor' }
  | { kind: 'auth_failed' };

@Injectable()
export class AuthService {
  constructor(
    private readonly githubService: GitHubService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async startGitHubOAuth(): Promise<{ authorizeUrl: string }> {
    const state = await this.githubService.signOAuthState();
    return {
      authorizeUrl: this.githubService.buildAuthorizeUrl(state),
    };
  }

  async handleGitHubCallback(
    code: string | undefined,
    state: string | undefined,
  ): Promise<GitHubCallbackResult> {
    try {
      if (!code?.trim()) {
        return { kind: 'auth_failed' };
      }

      await this.githubService.verifyOAuthState(state);
      const accessToken = await this.githubService.exchangeCodeForToken(
        code.trim(),
      );
      const profile = await this.githubService.fetchGitHubUser(accessToken);

      const isSponsor = await this.githubService.isActiveSponsor(profile.login);
      if (!isSponsor) {
        return { kind: 'not_sponsor' };
      }

      const githubId = String(profile.id);
      const githubLogin = profile.login.trim();
      const email =
        profile.email ??
        `${githubId}@users.noreply.github.com`.toLowerCase();

      const existingByGithub = await this.userRepository.findOneBy({
        githubId,
      });
      const existingByEmail = await this.userRepository.findOneBy({ email });
      const user = await this.userRepository.save({
        id: existingByGithub?.id ?? existingByEmail?.id,
        email,
        githubId,
        githubLogin,
      });

      const token = await this.jwtService.signAsync({
        sub: githubId,
        email: user.email,
        userId: user.id,
        githubLogin: user.githubLogin,
      });

      return { kind: 'success', accessToken: token };
    } catch {
      return { kind: 'auth_failed' };
    }
  }
}
