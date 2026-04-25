import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterPreset } from '../database/entities/filter-preset.entity';
import { SaveFilterPresetDto } from './dto/save-filter-preset.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(FilterPreset)
    private readonly filterPresetRepository: Repository<FilterPreset>,
  ) {}

  async saveFilterPreset(userId: string, payload: SaveFilterPresetDto) {
    await this.filterPresetRepository.upsert(
      {
        userId,
        role: payload.role,
        stack: payload.stack,
        seniority: payload.seniority,
        locations: payload.locations,
        alertsEnabled: payload.alertsEnabled,
      },
      {
        conflictPaths: ['userId'],
      },
    );

    return this.filterPresetRepository.findOneByOrFail({ userId });
  }
}
