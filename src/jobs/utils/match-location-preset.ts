import { Job } from '../../database/entities/job.entity';
import { formatRawLocation, stripCompanyNameFromLocation } from './clean-location';
import {
  extractCountryMentionsFromText,
  extractLocationFacets,
} from './normalize-location';

/** Preset token for remote-friendly roles (aligned with frontend `REMOTE_LOCATION`). */
export const REMOTE_LOCATION = 'remote';

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

function matchesSelectedCountries(job: Job, selectedCountries: string[]): boolean {
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
 * - **Remote only** (preset is just `remote`): any job with `isRemote` matches.
 * - **One or more countries**: job must match a selected country via parsed facets,
 *   stored location columns, location text, or (if both are empty) country mentions in the
 *   job title. Being
 *   remote is **not** enough by itself,
 *   otherwise every `isRemote` listing worldwide would appear when users also tick Remote
 *   alongside countries.
 */
export function matchesJobLocationPreset(job: Job, selectedLocations: string[]): boolean {
  const normalizedLocations = selectedLocations
    .map((value) => normalizeCountryToken(value))
    .filter((value) => value.length > 0);
  if (normalizedLocations.length === 0) {
    return true;
  }

  const wantsRemote = normalizedLocations.includes(REMOTE_LOCATION);
  const selectedCountries = normalizedLocations.filter(
    (value) => value !== REMOTE_LOCATION,
  );

  if (wantsRemote && selectedCountries.length === 0) {
    return job.isRemote;
  }

  if (selectedCountries.length > 0) {
    return matchesSelectedCountries(job, selectedCountries);
  }

  return wantsRemote && job.isRemote;
}
