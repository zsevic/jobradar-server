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

/** Optional board custom field; geo often lives here when `location.name` is only "In-Office" / "Remote". */
const GREENHOUSE_METADATA_JOB_POSTING_LOCATION = 'Job Posting Location';

interface GreenhouseMetadataItem {
  id?: number;
  name?: string;
  /** `multi_select` is string[]; `single_select` or free text may be a string. */
  value?: string | string[] | null;
  value_type?: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location?: {
    name?: string;
  };
  /** Custom fields — some companies expose office/geo under "Job Posting Location". */
  metadata?: GreenhouseMetadataItem[];
  updated_at?: string;
  first_published?: string;
  absolute_url?: string;
  content?: string;
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

/**
 * Reads the optional Greenhouse custom field whose label is "Job Posting Location".
 * Not all boards define it; value may be `multi_select` (array) or a single string.
 */
function extractJobPostingLocationFromMetadata(
  metadata: GreenhouseMetadataItem[] | undefined,
): string | null {
  if (!metadata?.length) {
    return null;
  }
  const item = metadata.find(
    (m) => m.name?.trim() === GREENHOUSE_METADATA_JOB_POSTING_LOCATION,
  );
  if (item == null || item.value == null) {
    return null;
  }
  const { value } = item;
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => String(v).trim())
      .filter((s) => s.length > 0);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

const GREENHOUSE_WORK_MODE_ONLY = new Set([
  'remote',
  'hybrid',
  'onsite',
  'distributed',
  'worldwide',
  'global',
  'anywhere',
  'unknown',
  'tbd',
  'multiple locations',
  'multi-location',
  'various',
  'flexible',
]);

function isWorkModeOnlySegment(segment: string): boolean {
  const s = segment.trim().toLowerCase();
  if (!s) {
    return true;
  }
  if (GREENHOUSE_WORK_MODE_ONLY.has(s)) {
    return true;
  }
  const t = segment.trim();
  return /^in[\s-]?office$/i.test(t) || /^on[\s-]?site$/i.test(t);
}

/**
 * True when `location.name` carries no place tokens (work arrangement / placeholder only).
 * Compound labels like `Hybrid; In-Office` or `Hybrid or Remote` count as non-geographic so metadata can supply city/country.
 * Strings with a comma are treated as geographic (city/state/country style).
 */
function isNonGeographicGreenhouseLocation(name: string): boolean {
  const n = name.trim();
  if (!n) {
    return true;
  }
  if (/,/.test(n)) {
    return false;
  }
  const segments = n
    .split(
      /\s*;\s*|\s*\|\s*|\s*\/\s*|\s+-\s+|\s+or\s+|\s+and\s+/i,
    )
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (segments.length === 0) {
    return true;
  }
  return segments.every((seg) => isWorkModeOnlySegment(seg));
}

/**
 * Prefer `location.name`; when it is empty or non-geographic and metadata has
 * "Job Posting Location", use that for normalization / facets.
 */
function resolveValidDate(value?: string | Date | null): Date | null {
  if (value == null) {
    return null;
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveGreenhouseGeoRaw(
  locationName: string | undefined,
  metadata: GreenhouseMetadataItem[] | undefined,
): string {
  const primary = locationName?.trim() ?? '';
  const posting = extractJobPostingLocationFromMetadata(metadata);
  if (posting) {
    if (!primary || isNonGeographicGreenhouseLocation(primary)) {
      return posting;
    }
    return primary;
  }
  return primary || 'Unknown';
}

@Injectable()
export class GreenhouseAdapter implements JobProviderAdapter {
  private readonly logger = new Logger(GreenhouseAdapter.name);
  private readonly baseUrl = 'https://boards-api.greenhouse.io/v1/boards';

  constructor(private readonly httpService: HttpService) {}

  async fetchJobs(
    sourceExternalId: string,
    sourceName: string,
  ): Promise<NormalizedJob[]> {
    const endpoint = `${this.baseUrl}/${encodeURIComponent(sourceExternalId)}/jobs`;
    const { data } = await firstValueFrom(
      this.httpService.get<GreenhouseJobsResponse>(endpoint, {
        params: {
          content: true,
        },
        timeout: 5000,
      }),
    );

    const jobs = data.jobs ?? [];
    this.logger.log(
      `Fetched ${jobs.length} greenhouse jobs for ${sourceExternalId}`,
    );

    return jobs
      .filter((job) => !!job.id && !!job.title && !!job.absolute_url)
      .map((job) => {
        const combinedRaw = resolveGreenhouseGeoRaw(
          job.location?.name,
          job.metadata,
        );
        const rawLocation = formatRawLocation(combinedRaw);
        const geoRaw = stripCompanyNameFromLocation(rawLocation, sourceName);
        const primaryLower = (job.location?.name ?? '').toLowerCase();
        const locationLower = geoRaw.toLowerCase();
        const isRemote =
          primaryLower.includes('remote') ||
          primaryLower.includes('anywhere') ||
          locationLower.includes('remote') ||
          locationLower.includes('anywhere');
        const location = resolveNormalizedLocation(geoRaw);
        const title = stripLocationFromTitle(job.title.trim(), location);
        const role = classifyRoleFromTitle(title);
        const stack = extractStackFromJobText(title, job.content, role);

        return {
          provider: SourceProvider.GREENHOUSE,
          externalId: String(job.id),
          title,
          company: sourceName,
          location,
          locationRaw: geoRaw,
          isRemote,
          postedAt:
            resolveValidDate(job.updated_at) ??
            resolveValidDate(job.first_published) ??
            new Date(),
          url: job.absolute_url as string,
          role: role === 'other' ? null : role,
          stack,
          seniorities: extractSeniorityFromTitle(title),
        };
      });
  }
}
