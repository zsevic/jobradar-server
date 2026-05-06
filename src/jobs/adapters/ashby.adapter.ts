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

interface AshbyPostalAddress {
  addressCountry?: string;
  addressRegion?: string;
  addressLocality?: string;
}

interface AshbyApiJob {
  id?: string;
  title?: string;
  location?: string;
  /** Primary office postal data; `addressCountry` backs `locationCountryHints` like secondaries. */
  address?: {
    postalAddress?: AshbyPostalAddress;
  };
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
    postalAddress?: AshbyPostalAddress;
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
        const role = classifyRoleWithDescriptionFallback(
          title,
          job.descriptionPlain,
        );

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
          seniorities: extractSeniorityFromTitle(title),
        };
      })
      .filter((job) => job.url.length > 0);
  }

  /**
   * Ashby may set `addressCountry` to the macro-region "European Union"; that
   * is not a country facet and is merged as a region hint — skip it entirely.
   */
  private sanitizeAshbyAddressCountry(country?: string): string | undefined {
    const t = country?.trim();
    if (!t) {
      return undefined;
    }
    if (t.replace(/\s+/g, ' ').toLowerCase() === 'european union') {
      return undefined;
    }
    return t;
  }

  private resolveRawLocation(job: AshbyApiJob): {
    rawLocation: string;
    countryHints: string[];
  } {
    const primaryCountry = this.sanitizeAshbyAddressCountry(
      job.address?.postalAddress?.addressCountry,
    );
    const primaryLabel = job.location?.trim();
    const primary =
      (primaryLabel
        ? this.enrichGenericLocationWithCountry(primaryLabel, primaryCountry)
        : '') || 'Unknown';
    const secondary = new Set<string>();
    const countryHints = new Set<string>();
    this.addLocationValue(countryHints, primaryCountry);
    for (const entry of job.secondaryLocations ?? []) {
      this.addLocationValue(
        secondary,
        this.resolveSecondaryLocationLabel(entry),
      );
      this.addLocationValue(
        countryHints,
        this.sanitizeAshbyAddressCountry(
          entry.address?.postalAddress?.addressCountry,
        ),
      );
    }

    const parts = [primary, ...Array.from(secondary)];
    return {
      rawLocation: formatRawLocation(parts.join(' | ') || 'Unknown'),
      countryHints: Array.from(countryHints),
    };
  }

  /**
   * If the location text is a generic, non-geographic label (e.g. "Remote",
   * "Hybrid"), append the postal country so it survives facet token cleanup
   * (e.g. "Remote" + "United States" → "Remote, United States"). Used for the
   * primary `location` string and for each secondary entry. Country still
   * merges into `locationCountries` via `locationCountryHints` from the API.
   */
  private enrichGenericLocationWithCountry(
    location: string,
    country?: string,
  ): string {
    const trimmed = location.trim();
    const c = country?.trim();
    if (!c) {
      return trimmed;
    }
    const isGeneric =
      /^(remote|anywhere|distributed|hybrid|on[-\s]?site|onsite)$/i.test(
        trimmed,
      );
    if (!isGeneric) {
      return trimmed;
    }
    if (trimmed.toLowerCase().includes(c.toLowerCase())) {
      return trimmed;
    }
    return `${trimmed}, ${c}`;
  }

  private resolveSecondaryLocationLabel(
    entry: AshbySecondaryLocation,
  ): string | undefined {
    const location = entry.location?.trim();
    if (!location) {
      return undefined;
    }
    return this.enrichGenericLocationWithCountry(
      location,
      this.sanitizeAshbyAddressCountry(
        entry.address?.postalAddress?.addressCountry,
      ),
    );
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
