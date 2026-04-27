import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveFilterPresetDto } from './dto/save-filter-preset.dto';
import { OnboardingService } from './onboarding.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('preset')
  async getPreset(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    const preset = await this.onboardingService.getFilterPreset(userId);
    return preset ?? null;
  }

  @Post('preset')
  async savePreset(
    @Req() request: AuthenticatedRequest,
    @Body() payload: SaveFilterPresetDto,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return this.onboardingService.saveFilterPreset(userId, payload);
  }
}
