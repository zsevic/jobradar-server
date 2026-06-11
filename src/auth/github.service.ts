import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { User } from '../database/entities/user.entity';
import { SponsorVerifyResult } from './types/sponsor-verify-result';

export interface GitHubUserProfile {
  id: number;
  login: string;
  email: string | null;
}

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

@Injectable()
export class GitHubService implements OnModuleDestroy {
  private redis: Redis | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleDestroy(): void {
    void this.redis?.quit();
  }

  getOAuthRedirectUri(): string {
    const explicit = this.configService.get<string>('GITHUB_OAUTH_REDIRECT_URI');
    if (explicit?.trim()) {
      return explicit.trim();
    }
    const backendOrigin = (
      this.configService.get<string>('BACKEND_ORIGIN') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${backendOrigin}/api/auth/github/callback`;
  }

  async signOAuthState(): Promise<string> {
    return this.jwtService.signAsync(
      { purpose: 'github-oauth-state' },
      { expiresIn: '10m' },
    );
  }

  async verifyOAuthState(state: string | undefined): Promise<void> {
    if (!state?.trim()) {
      throw new BadRequestException('Missing OAuth state');
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ purpose?: string }>(
        state,
      );
      if (payload.purpose !== 'github-oauth-state') {
        throw new BadRequestException('Invalid OAuth state');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired OAuth state');
    }
  }

  buildAuthorizeUrl(state: string): string {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException(
        'Server not configured: missing GITHUB_CLIENT_ID',
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.getOAuthRedirectUri(),
      scope: 'read:user user:email',
      state,
    });
    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Server not configured: missing GitHub OAuth credentials',
      );
    }

    let data: { access_token?: string; error?: string };
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token?: string;
          error?: string;
        }>(
          GITHUB_TOKEN_URL,
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: this.getOAuthRedirectUri(),
          },
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          },
        ),
      );
      data = response.data;
    } catch {
      throw new ServiceUnavailableException('Failed to exchange GitHub OAuth code');
    }

    const accessToken = data.access_token?.trim();
    if (!accessToken) {
      throw new BadRequestException(
        data.error ?? 'GitHub OAuth did not return an access token',
      );
    }
    return accessToken;
  }

  async fetchGitHubUser(accessToken: string): Promise<GitHubUserProfile> {
    let profile: { id: number; login: string; email: string | null };
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{ id: number; login: string; email: string | null }>(
          'https://api.github.com/user',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
            },
            timeout: 8000,
          },
        ),
      );
      profile = data;
    } catch {
      throw new ServiceUnavailableException('Failed to load GitHub user profile');
    }

    let email = profile.email?.trim().toLowerCase() ?? null;
    if (!email) {
      email = await this.fetchPrimaryVerifiedEmail(accessToken);
    }

    return {
      id: profile.id,
      login: profile.login,
      email,
    };
  }

  private async fetchPrimaryVerifiedEmail(
    accessToken: string,
  ): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<
          Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>
        >('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
          timeout: 8000,
        }),
      );
      const primary = data.find((entry) => entry.primary && entry.verified);
      const verified = data.find((entry) => entry.verified);
      const chosen = primary ?? verified;
      return chosen?.email.trim().toLowerCase() ?? null;
    } catch {
      return null;
    }
  }

  private isSponsorAccountOwner(login: string): boolean {
    const sponsorLogin =
      this.configService.get<string>('GITHUB_SPONSOR_LOGIN') ?? 'zsevic';
    return login.trim().toLowerCase() === sponsorLogin.trim().toLowerCase();
  }

  async isActiveSponsor(login: string): Promise<boolean> {
    const accountLogin = login.trim();
    if (!accountLogin) {
      return false;
    }

    if (this.isSponsorAccountOwner(accountLogin)) {
      return true;
    }

    const cacheKey = accountLogin.toLowerCase();
    const cached = await this.getCachedSponsorStatus(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const isSponsor = await this.queryIsSponsoredBy(accountLogin);
    await this.setCachedSponsorStatus(cacheKey, isSponsor);
    return isSponsor;
  }

  async verifySponsorshipForUser(
    user: Pick<User, 'githubLogin'>,
  ): Promise<SponsorVerifyResult> {
    const login = user.githubLogin?.trim();
    if (!login) {
      return { ok: false, reason: 'no_github_login' };
    }

    try {
      const active = await this.isActiveSponsor(login);
      return active ? { ok: true } : { ok: false, reason: 'not_sponsor' };
    } catch {
      return { ok: false, reason: 'http' };
    }
  }

  private async queryIsSponsoredBy(accountLogin: string): Promise<boolean> {
    const sponsorLogin =
      this.configService.get<string>('GITHUB_SPONSOR_LOGIN') ?? 'zsevic';
    const token = this.configService.get<string>('GITHUB_SPONSOR_CHECK_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException(
        'Server not configured: missing GITHUB_SPONSOR_CHECK_TOKEN',
      );
    }

    const query = `
      query($sponsorLogin: String!, $accountLogin: String!) {
        user(login: $sponsorLogin) {
          isSponsoredBy(accountLogin: $accountLogin)
        }
      }
    `;

    let data: {
      data?: { user?: { isSponsoredBy?: boolean } | null };
      errors?: Array<{ message: string }>;
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post<typeof data>(
          GITHUB_GRAPHQL_URL,
          {
            query,
            variables: {
              sponsorLogin,
              accountLogin,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          },
        ),
      );
      data = response.data;
    } catch {
      throw new ServiceUnavailableException('Failed to verify GitHub sponsorship');
    }

    if (data.errors?.length) {
      throw new ServiceUnavailableException('GitHub sponsorship query failed');
    }

    return data.data?.user?.isSponsoredBy === true;
  }

  private getCacheTtlSeconds(): number {
    const parsed = Number(
      this.configService.get<string>('SPONSOR_CHECK_CACHE_TTL_SECONDS') ?? 300,
    );
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 300;
    }
    return Math.floor(parsed);
  }

  private getRedis(): Redis | null {
    if (this.redis) {
      return this.redis;
    }
    const url = this.configService.get<string>('REDIS_URL')?.trim();
    if (!url) {
      return null;
    }
    this.redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    return this.redis;
  }

  private async getCachedSponsorStatus(login: string): Promise<boolean | null> {
    const redis = this.getRedis();
    if (!redis) {
      return null;
    }
    try {
      if (redis.status !== 'ready') {
        await redis.connect();
      }
      const value = await redis.get(`sponsor:active:${login}`);
      if (value === '1') {
        return true;
      }
      if (value === '0') {
        return false;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async setCachedSponsorStatus(
    login: string,
    isSponsor: boolean,
  ): Promise<void> {
    const redis = this.getRedis();
    const ttl = this.getCacheTtlSeconds();
    if (!redis || ttl <= 0) {
      return;
    }
    try {
      if (redis.status !== 'ready') {
        await redis.connect();
      }
      await redis.set(
        `sponsor:active:${login}`,
        isSponsor ? '1' : '0',
        'EX',
        ttl,
      );
    } catch {
      // Cache is best-effort.
    }
  }
}
