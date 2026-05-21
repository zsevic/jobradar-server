import { Job } from '../../database/entities/job.entity';
import {
  formatRawLocation,
  stripCompanyNameFromLocation,
} from './clean-location';
import {
  extractCountriesFromGeoScopedRemoteText,
  extractCountryMentionsFromText,
  extractLocationFacets,
  textImpliesGeoScopedRemote,
} from './normalize-location';

/** Preset token for remote-friendly roles (aligned with frontend `REMOTE_LOCATION`). */
export const REMOTE_LOCATION = 'remote';

/** Preset token for location-agnostic remote only (aligned with frontend `FULLY_REMOTE_LOCATION`). */
export const FULLY_REMOTE_LOCATION = 'fully-remote';

function jobImpliesGeoScopedRemote(job: Job): boolean {
  if (job.locationCountries.length > 0 || job.locationRegions.length > 0) {
    return true;
  }
  if (textImpliesGeoScopedRemote(job.title)) {
    return true;
  }
  const raw = job.locationRaw ?? job.location;
  if (textImpliesGeoScopedRemote(raw)) {
    return true;
  }
  const titleCountries = [
    ...extractCountryMentionsFromText(job.title),
    ...extractCountriesFromGeoScopedRemoteText(job.title),
  ];
  return titleCountries.length > 0;
}

export function isFullyRemoteJob(job: Job): boolean {
  if (!job.isRemote) {
    return false;
  }
  if (job.location.trim().toLowerCase() !== 'remote') {
    return false;
  }
  if (jobImpliesGeoScopedRemote(job)) {
    return false;
  }
  const raw = (job.locationRaw ?? job.location).toLowerCase();
  if (/\bhybrid\b/.test(raw)) {
    return false;
  }
  return true;
}

export function normalizeCountryToken(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'us' || normalized === 'usa') {
    return 'united states';
  }
  if (normalized === 'uk') {
    return 'united kingdom';
  }
  if (normalized === 'uae') {
    return 'united arab emirates';
  }
  return normalized;
}

function matchesSelectedCountries(
  job: Job,
  selectedCountries: string[],
): boolean {
  if (selectedCountries.length === 0) {
    return false;
  }

  const facets = extractLocationFacets(
    stripCompanyNameFromLocation(
      formatRawLocation(job.locationRaw ?? job.location ?? ''),
      job.company,
    ),
  );

  const hasCountriesFromLocation =
    job.locationCountries.length > 0 || facets.countries.length > 0;
  const countriesFromTitle = hasCountriesFromLocation
    ? []
    : extractCountryMentionsFromText(job.title);

  const countrySet = new Set<string>([
    ...job.locationCountries.map((c) => c.toLowerCase()),
    ...facets.countries,
    ...countriesFromTitle,
  ]);

  const tokenSet = new Set<string>([
    ...job.locationTokens.map((t) => t.toLowerCase()),
    ...facets.tokens,
    ...job.locationRegions.map((r) => r.toLowerCase()),
    ...facets.regions,
  ]);

  const locationLower = job.location.toLowerCase();
  const rawLower = (job.locationRaw ?? job.location).toLowerCase();

  return selectedCountries.some(
    (country) =>
      countrySet.has(country) ||
      tokenSet.has(country) ||
      locationLower.includes(country) ||
      rawLower.includes(country) ||
      (country === 'united states' && /\b(usa|us)\b/.test(rawLower)) ||
      (country === 'united kingdom' && /\buk\b/i.test(rawLower)) ||
      (country === 'united arab emirates' && /\buae\b/i.test(rawLower)),
  );
}

/**
 * Location matching rules:
 *
 * - **Remote only** (`remote`): any job with `isRemote` matches.
 * - **Fully remote only** (`fully-remote`): {@link isFullyRemoteJob} (no geo/hybrid).
 * - **Countries**: country match via facets / stored columns / title.
 * - **Countries + fully-remote**: country match OR fully remote job.
 * - **Countries + remote**: country match only (broad remote does not add worldwide listings).
 * - **remote + fully-remote** (no countries): broad `isRemote`.
 */
export function matchesJobLocationPreset(
  job: Job,
  selectedLocations: string[],
): boolean {
  const normalizedLocations = selectedLocations
    .map((value) => normalizeCountryToken(value))
    .filter((value) => value.length > 0);
  if (normalizedLocations.length === 0) {
    return true;
  }

  const wantsRemote = normalizedLocations.includes(REMOTE_LOCATION);
  const wantsFullyRemote = normalizedLocations.includes(FULLY_REMOTE_LOCATION);
  const selectedCountries = normalizedLocations.filter(
    (value) => value !== REMOTE_LOCATION && value !== FULLY_REMOTE_LOCATION,
  );

  if (selectedCountries.length > 0) {
    const countryMatch = matchesSelectedCountries(job, selectedCountries);
    if (wantsFullyRemote) {
      return countryMatch || isFullyRemoteJob(job);
    }
    return countryMatch;
  }

  if (wantsRemote && wantsFullyRemote) {
    return job.isRemote;
  }

  if (wantsFullyRemote) {
    return isFullyRemoteJob(job);
  }

  if (wantsRemote) {
    return job.isRemote;
  }

  return false;
}
