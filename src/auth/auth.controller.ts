import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('github')
  async startGitHubOAuth(@Res() response: Response): Promise<void> {
    const { authorizeUrl } = await this.authService.startGitHubOAuth();
    response.redirect(authorizeUrl);
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const frontendOrigin = (
      this.configService.get<string>('FRONTEND_ORIGIN') ??
      'http://localhost:3001'
    ).replace(/\/$/, '');

    const result = await this.authService.handleGitHubCallback(code, state);
    if (result.kind === 'success') {
      const token = encodeURIComponent(result.accessToken);
      response.redirect(`${frontendOrigin}/auth/callback?token=${token}`);
      return;
    }
    if (result.kind === 'not_sponsor') {
      response.redirect(`${frontendOrigin}/login?error=not_sponsor`);
      return;
    }
    response.redirect(`${frontendOrigin}/login?error=auth_failed`);
  }
}
