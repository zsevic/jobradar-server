import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SourceProvider } from '../../database/entities/source.entity';
import { JobProviderAdapter } from '../interfaces/job-provider-adapter.interface';
import { NormalizedJob } from '../interfaces/normalized-job.interface';
import {
  formatRawLocation,
  resolveNormalizedLocation,
  stripCompanyNameFromLocation,
} from '../utils/clean-location';
import { extractSeniorityFromTitle } from '../utils/extract-seniority';
import {
  classifyRoleWithDescriptionFallback,
  extractStackFromJobText,
} from '../utils/extract-stack';
import { stripLocationFromTitle } from '../utils/strip-title-location';
import {
  leverRegionFromApiRegion,
  resolveLeverPostingsBaseUrl,
} from './lever-api.constants';

const PAGE_LIMIT = 100;

interface LeverCategories {
  location?: string;
  allLocations?: string[];
  team?: string;
  commitment?: string;
}

interface LeverList {
  text?: string;
  content?: string;
}

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  country?: string;
  workplaceType?: string;
  categories?: LeverCategories;
  descriptionPlain?: string;
  openingPlain?: string;
  descriptionBodyPlain?: string;
  additionalPlain?: string;
  lists?: LeverList[];
}

function resolveValidDateFromMs(value?: number | null): Date | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stripSimpleHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLeverRemoteIndicated(workplaceType?: string): boolean {
  return workplaceType?.trim().toLowerCase() === 'remote';
}

function addLocationValue(target: Set<string>, value?: string): void {
  const cleaned = value?.trim();
  if (!cleaned) {
    return;
  }
  const dedupeKey = cleaned.toLowerCase();
  const exists = Array.from(target).some(
    (item) => item.toLowerCase() === dedupeKey,
  );
  if (!exists) {
    target.add(cleaned);
  }
}

@Injectable()
export class LeverAdapter implements JobProviderAdapter {
  private readonly logger = new Logger(LeverAdapter.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchJobs(
    sourceExternalId: string,
    sourceName: string,
    apiRegion?: 'eu' | null,
  ): Promise<NormalizedJob[]> {
    const baseUrl = resolveLeverPostingsBaseUrl(
      leverRegionFromApiRegion(apiRegion),
    );
    const postings = await this.fetchAllPostings(sourceExternalId, baseUrl);
    this.logger.log(
      `Fetched ${postings.length} lever jobs for ${sourceExternalId}`,
    );

    return postings
      .filter((posting) => !!posting.text?.trim())
      .map((posting) =>
        this.normalizePosting(posting, sourceExternalId, sourceName),
      )
      .filter((job) => job.url.length > 0);
  }

  private async fetchAllPostings(
    site: string,
    baseUrl: string,
  ): Promise<LeverPosting[]> {
    const all: LeverPosting[] = [];
    let skip = 0;

    for (;;) {
      const page = await this.fetchPage(site, baseUrl, skip, PAGE_LIMIT);
      all.push(...page);
      if (page.length < PAGE_LIMIT) {
        break;
      }
      skip += PAGE_LIMIT;
    }

    return all;
  }

  private async fetchPage(
    site: string,
    baseUrl: string,
    skip: number,
    limit: number,
  ): Promise<LeverPosting[]> {
    const endpoint = `${baseUrl}/${encodeURIComponent(site)}`;
    const { data } = await firstValueFrom(
      this.httpService.get<LeverPosting[]>(endpoint, {
        params: {
          mode: 'json',
          skip,
          limit,
        },
        timeout: 10_000,
      }),
    );

    return Array.isArray(data) ? data : [];
  }

  private normalizePosting(
    posting: LeverPosting,
    sourceExternalId: string,
    sourceName: string,
  ): NormalizedJob {
    const { rawLocation, countryHints } = this.resolveRawLocation(posting);
    const geoRaw = stripCompanyNameFromLocation(rawLocation, sourceName);
    const url = (posting.hostedUrl || posting.applyUrl || '').trim();
    const remoteIndicatedByProvider = isLeverRemoteIndicated(
      posting.workplaceType,
    );
    const location = resolveNormalizedLocation(geoRaw, {
      remoteIndicatedByProvider,
    });
    const isRemote =
      remoteIndicatedByProvider || geoRaw.toLowerCase().includes('remote');
    const rawTitle = (posting.text as string).trim();
    const title = stripLocationFromTitle(rawTitle, location);
    const description = this.buildDescription(posting);
    const role = classifyRoleWithDescriptionFallback(title, description);

    return {
      provider: SourceProvider.LEVER,
      externalId:
        posting.id?.toString() ||
        `${sourceExternalId}:${rawTitle}:${posting.createdAt}`,
      title,
      company: sourceName,
      location,
      locationRaw: geoRaw,
      locationCountryHints: countryHints,
      remoteIndicatedByProvider,
      isRemote,
      postedAt: resolveValidDateFromMs(posting.createdAt) ?? new Date(),
      url,
      role: role === 'other' ? null : role,
      stack: extractStackFromJobText(title, description, role),
      seniorities: extractSeniorityFromTitle(title),
    };
  }

  private resolveRawLocation(posting: LeverPosting): {
    rawLocation: string;
    countryHints: string[];
  } {
    const categories = posting.categories;
    const primary = categories?.location?.trim() || '';
    const extras = new Set<string>();
    const countryHints = new Set<string>();

    if (posting.country?.trim()) {
      addLocationValue(countryHints, posting.country.trim());
    }

    for (const loc of categories?.allLocations ?? []) {
      addLocationValue(extras, loc);
    }

    if (primary) {
      const primaryKey = primary.toLowerCase();
      for (const item of Array.from(extras)) {
        if (item.toLowerCase() === primaryKey) {
          extras.delete(item);
        }
      }
    }

    const parts = primary
      ? [primary, ...Array.from(extras)]
      : Array.from(extras);
    const joined = parts.length > 0 ? parts.join(' | ') : 'Unknown';

    return {
      rawLocation: formatRawLocation(joined),
      countryHints: Array.from(countryHints),
    };
  }

  private buildDescription(posting: LeverPosting): string {
    const parts: string[] = [];
    for (const field of [
      posting.descriptionPlain,
      posting.openingPlain,
      posting.descriptionBodyPlain,
      posting.additionalPlain,
    ]) {
      const t = field?.trim();
      if (t) {
        parts.push(t);
      }
    }

    for (const list of posting.lists ?? []) {
      const label = list.text?.trim();
      const content = list.content?.trim();
      if (label && content) {
        parts.push(`${label}\n${stripSimpleHtml(content)}`);
      } else if (label) {
        parts.push(label);
      } else if (content) {
        parts.push(stripSimpleHtml(content));
      }
    }

    return parts.join('\n\n');
  }
}
