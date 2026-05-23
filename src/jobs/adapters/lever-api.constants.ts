export type LeverRegion = 'us' | 'eu';

export const DEFAULT_LEVER_US_POSTINGS_BASE_URL =
  'https://api.lever.co/v0/postings';
export const DEFAULT_LEVER_EU_POSTINGS_BASE_URL =
  'https://api.eu.lever.co/v0/postings';

export function resolveLeverPostingsBaseUrl(region: LeverRegion): string {
  return region === 'eu'
    ? DEFAULT_LEVER_EU_POSTINGS_BASE_URL
    : DEFAULT_LEVER_US_POSTINGS_BASE_URL;
}

/** Map stored source `apiRegion` (`null` / omitted = US) to Lever host region. */
export function leverRegionFromApiRegion(apiRegion?: 'eu' | null): LeverRegion {
  return apiRegion === 'eu' ? 'eu' : 'us';
}
