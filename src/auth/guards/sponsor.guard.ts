import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { GitHubService } from '../github.service';

export const SPONSORSHIP_REQUIRED_MESSAGE =
  'Access requires an active GitHub Sponsors subscription to @zsevic. If your sponsorship expired, renew at github.com/sponsors/zsevic and sign in again.';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    githubLogin?: string;
  };
}

@Injectable()
export class SponsorGuard implements CanActivate {
  constructor(private readonly githubService: GitHubService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const githubLogin = request.user?.githubLogin?.trim();
    if (!githubLogin) {
      throw new ForbiddenException({
        error: 'sponsorship_required',
        message: SPONSORSHIP_REQUIRED_MESSAGE,
      });
    }

    try {
      const active = await this.githubService.isActiveSponsor(githubLogin);
      if (!active) {
        throw new ForbiddenException({
          error: 'sponsorship_required',
          message: SPONSORSHIP_REQUIRED_MESSAGE,
        });
      }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Unable to verify GitHub sponsorship status',
      );
    }
  }
}
