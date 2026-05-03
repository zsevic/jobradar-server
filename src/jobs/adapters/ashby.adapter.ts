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
  classifyRoleFromTitle,
  extractStackFromJobText,
} from '../utils/extract-stack';
import { stripLocationFromTitle } from '../utils/strip-title-location';

interface AshbyApiJob {
  id?: string;
  title?: string;
  location?: string;
  secondaryLocations?: AshbySecondaryLocation[];
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  isListed?: boolean;
}

interface AshbySecondaryLocation {
  location?: string;
  address?: {
    postalAddress?: {
      addressCountry?: string;
      addressRegion?: string;
      addressLocality?: string;
    };
  };
}

interface AshbyApiResponse {
  jobs: AshbyApiJob[];
}

@Injectable()
export class AshbyAdapter implements JobProviderAdapter {
  private readonly logger = new Logger(AshbyAdapter.name);
  private readonly baseUrl = 'https://api.ashbyhq.com/posting-api/job-board';

  constructor(private readonly httpService: HttpService) {}

  async fetchJobs(
    sourceExternalId: string,
    sourceName: string,
  ): Promise<NormalizedJob[]> {
    const endpoint = `${this.baseUrl}/${encodeURIComponent(sourceExternalId)}`;
    const { data } = await firstValueFrom(
      this.httpService.get<AshbyApiResponse>(endpoint, {
        timeout: 10000,
      }),
    );

    const jobs = data.jobs ?? [];
    this.logger.log(
      `Fetched ${jobs.length} ashby jobs for ${sourceExternalId}`,
    );

    return jobs
      .filter(
        (job) => (job.isListed ?? true) && !!job.title && !!job.publishedAt,
      )
      .map((job) => {
        const { rawLocation, countryHints } = this.resolveRawLocation(job);
        const geoRaw = stripCompanyNameFromLocation(rawLocation, sourceName);
        const url = job.jobUrl || job.applyUrl || '';
        const remoteIndicatedByProvider =
          Boolean(job.isRemote) ||
          job.workplaceType?.toLowerCase() === 'remote';
        const location = resolveNormalizedLocation(geoRaw, {
          remoteIndicatedByProvider,
        });
        const isRemote =
          remoteIndicatedByProvider ||
          geoRaw.toLowerCase().includes('remote');
        const rawTitle = (job.title as string).trim();
        const title = stripLocationFromTitle(rawTitle, location);
        const role = classifyRoleFromTitle(title);

        return {
          provider: SourceProvider.ASHBY,
          externalId:
            job.id?.toString() ||
            `${sourceExternalId}:${rawTitle}:${job.publishedAt}`,
          title,
          company: sourceName,
          location,
          locationRaw: geoRaw,
          locationCountryHints: countryHints,
          remoteIndicatedByProvider,
          isRemote,
          postedAt: new Date(job.publishedAt as string),
          url,
          role: role === 'other' ? null : role,
          stack: extractStackFromJobText(title, job.descriptionPlain, role),
          seniority: extractSeniorityFromTitle(title),
        };
      })
      .filter((job) => job.url.length > 0);
  }

  private resolveRawLocation(job: AshbyApiJob): {
    rawLocation: string;
    countryHints: string[];
  } {
    const primary = job.location?.trim() || 'Unknown';
    const secondary = new Set<string>();
    const countryHints = new Set<string>();
    for (const entry of job.secondaryLocations ?? []) {
      this.addLocationValue(
        secondary,
        this.resolveSecondaryLocationLabel(entry),
      );
      this.addLocationValue(
        countryHints,
        entry.address?.postalAddress?.addressCountry,
      );
    }

    const parts = [primary, ...Array.from(secondary)];
    return {
      rawLocation: formatRawLocation(parts.join(' | ') || 'Unknown'),
      countryHints: Array.from(countryHints),
    };
  }

  /**
   * If the secondary entry's location text is a generic, non-geographic label
   * (e.g. "Remote", "Hybrid"), append the postal country so it is preserved
   * after stripping remote tokens (e.g. "Remote" + "United States" →
   * "Remote, United States"). City/region/country labels keep their original
   * text — country still flows into locationCountries via countryHints.
   */
  private resolveSecondaryLocationLabel(
    entry: AshbySecondaryLocation,
  ): string | undefined {
    const location = entry.location?.trim();
    if (!location) {
      return undefined;
    }

    const country = entry.address?.postalAddress?.addressCountry?.trim();
    if (!country) {
      return location;
    }

    const isGeneric =
      /^(remote|anywhere|distributed|hybrid|on[-\s]?site|onsite)$/i.test(
        location,
      );
    if (!isGeneric) {
      return location;
    }

    if (location.toLowerCase().includes(country.toLowerCase())) {
      return location;
    }

    return `${location}, ${country}`;
  }

  private addLocationValue(target: Set<string>, value?: string): void {
    const cleaned = value?.trim();
    if (!cleaned) {
      return;
    }

    const dedupeKey = cleaned.toLowerCase();
    const existing = Array.from(target).some(
      (item) => item.toLowerCase() === dedupeKey,
    );
    if (!existing) {
      target.add(cleaned);
    }
  }
}
