import { extractLocationFacets } from './normalize-location';

const LOCATION_PART_ALIASES: Record<string, string> = {
  uk: 'united kingdom',
  us: 'united states',
  usa: 'united states',
  uae: 'united arab emirates',
  'czech republic': 'czechia',
  'republic of korea': 'south korea',
};

function canonicalLocationPart(value: string): string {
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return LOCATION_PART_ALIASES[cleaned] ?? cleaned;
}

export function cleanLocationAfterRemoteDetection(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return 'Unknown';
  }

  const cleaned = trimmed
    // remove standalone remote/anywhere tokens
    .replace(/\b(remote|anywhere)\b/gi, '')
    // collapse separators that may be left after token removal
    .replace(/\s*[-/|,]+\s*/g, ', ')
    // collapse repeated commas
    .replace(/,\s*,+/g, ', ')
    // trim leading/trailing commas and spaces
    .replace(/^[,\s]+|[,\s]+$/g, '')
    // normalize spacing
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Unknown';
  }

  // Dedupe repeated location segments while preserving order (e.g. country
  // repeated in both a city entry and a remote entry).
  const uniqueParts: string[] = [];
  const keyToIndex = new Map<string, number>();
  for (const part of cleaned.split(',')) {
    const displayPart = part.trim();
    if (!displayPart) {
      continue;
    }
    const canonicalKey = canonicalLocationPart(displayPart);
    const existingIndex = keyToIndex.get(canonicalKey);
    if (existingIndex === undefined) {
      keyToIndex.set(canonicalKey, uniqueParts.length);
      uniqueParts.push(displayPart);
      continue;
    }

    // Prefer explicit canonical country labels over abbreviations (e.g. UK -> United Kingdom).
    if (
      canonicalLocationPart(uniqueParts[existingIndex]) !== displayPart.toLowerCase() &&
      displayPart.toLowerCase() === canonicalKey
    ) {
      uniqueParts[existingIndex] = displayPart;
    }
  }

  return uniqueParts.length > 0 ? uniqueParts.join(', ') : 'Unknown';
}

export function formatRawLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return 'Unknown';
  }

  return trimmed
    .replace(/\s*;\s*/g, ', ')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Use plain "Remote" only when there is no geographic facet (country/region) in
 * the raw string. If the text includes a country or region, normalize the full
 * string (e.g. "Remote, United States" → cleaned location with geography).
 */
export function resolveNormalizedLocation(
  formattedRaw: string,
  options?: { remoteIndicatedByProvider?: boolean },
): string {
  const trimmed = formattedRaw.trim();
  const lower = trimmed.toLowerCase();
  const forFacets =
    !trimmed || lower === 'unknown' ? '' : trimmed;
  const facets = extractLocationFacets(forFacets);
  const hasGeo =
    facets.countries.length > 0 || facets.regions.length > 0;

  const sourceForClean =
    !trimmed || lower === 'unknown' ? 'Unknown' : trimmed;

  if (hasGeo) {
    return cleanLocationAfterRemoteDetection(sourceForClean);
  }

  const mentionsRemote = /\b(remote|anywhere|distributed)\b/i.test(trimmed);

  if (
    mentionsRemote ||
    (options?.remoteIndicatedByProvider && (!trimmed || lower === 'unknown'))
  ) {
    return 'Remote';
  }

  return cleanLocationAfterRemoteDetection(sourceForClean);
}
