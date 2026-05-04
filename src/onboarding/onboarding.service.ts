import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterPreset } from '../database/entities/filter-preset.entity';
import { SaveFilterPresetDto } from './dto/save-filter-preset.dto';
import { UpdateAlertsDto } from './dto/update-alerts.dto';

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

  async getFilterPreset(userId: string) {
    return this.filterPresetRepository.findOneBy({ userId });
  }

  async updateAlertsEnabled(userId: string, payload: UpdateAlertsDto) {
    const existing = await this.filterPresetRepository.findOneBy({ userId });
    if (!existing) {
      throw new NotFoundException('No filter preset found');
    }
    await this.filterPresetRepository.update(
      { userId },
      { alertsEnabled: payload.alertsEnabled },
    );
    return this.filterPresetRepository.findOneByOrFail({ userId });
  }
}
