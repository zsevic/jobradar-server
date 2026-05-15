import { extractLocationFacets } from './normalize-location';

/**
 * Sole location tokens that are employer / product names, not geography (ATS
 * sometimes echoes the company into the location field).
 */
const STANDALONE_NON_GEO_LOCATIONS = new Set<string>(['omnea']);

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

/** Strips empty parentheses `()` / `( )` left after label removal or ATS noise. */
function stripEmptyParentheses(value: string): string {
  let t = value.trim();
  while (/\(\s*\)/.test(t)) {
    t = t
      .replace(/\(\s*\)/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return t;
}

/**
 * Temporarily replaces hyphenated office/site labels so comma normalization does not
 * split `In-Office` into `In`, `Office` or break `On-Site`.
 */
function shieldHyphenatedWorkLabels(input: string): {
  shielded: string;
  restore: (s: string) => string;
} {
  const originals: string[] = [];
  const shielded = input.replace(
    /\b(in-office|in office|on-site|on site)\b/gi,
    (m) => {
      const idx = originals.length;
      originals.push(m);
      return `@@HYPHLABEL${idx}@@`;
    },
  );
  const restore = (s: string): string => {
    let out = s;
    for (let i = 0; i < originals.length; i += 1) {
      out = out.split(`@@HYPHLABEL${i}@@`).join(originals[i]);
    }
    return out;
  };
  return { shielded, restore };
}

export function cleanLocationAfterRemoteDetection(location: string): string {
  const trimmed = stripEmptyParentheses(location);
  if (!trimmed) {
    return 'Unknown';
  }

  const afterRemote = trimmed
    // remove standalone remote/anywhere tokens
    .replace(/\b(remote|anywhere)\b/gi, '')
    // Drop dangling connectors left over after remote/anywhere removal (e.g. "Boston or Remote").
    .replace(/^\s*(?:or|and|&)\s+/i, '')
    .replace(/\s+(?:or|and|&)\s*$/i, '')
    .replace(/(?:^|,)\s*(?:or|and|&)\s*,/gi, ',');
  const { shielded, restore } = shieldHyphenatedWorkLabels(afterRemote);
  const cleaned = restore(
    shielded
      // collapse separators that may be left after token removal
      .replace(/\s*[-/|,]+\s*/g, ', ')
      // collapse repeated commas
      .replace(/,\s*,+/g, ', ')
      // trim leading/trailing commas and spaces
      .replace(/^[,\s]+|[,\s]+$/g, '')
      // normalize spacing
      .replace(/\s{2,}/g, ' ')
      .trim(),
  );

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
      canonicalLocationPart(uniqueParts[existingIndex]) !==
        displayPart.toLowerCase() &&
      displayPart.toLowerCase() === canonicalKey
    ) {
      uniqueParts[existingIndex] = displayPart;
    }
  }

  const joined = uniqueParts.length > 0 ? uniqueParts.join(', ') : 'Unknown';
  return joined === 'Unknown' ? joined : stripEmptyParentheses(joined);
}

export function formatRawLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return 'Unknown';
  }

  return stripEmptyParentheses(
    trimmed
      .replace(/\s*;\s*/g, ', ')
      .replace(/,\s*,+/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  );
}

/**
 * Removes the posting employer name from free-text location strings when it appears
 * as a redundant label (e.g. "Mapbox Minsk", "Acme - Berlin"). Uses whole-word
 * matches; very short single-word company names (< 3 letters) are skipped.
 */
export function stripCompanyNameFromLocation(
  raw: string,
  company: string,
): string {
  const loc = raw.trim();
  if (!loc) {
    return raw;
  }
  const locSolo = loc.toLowerCase();
  if (STANDALONE_NON_GEO_LOCATIONS.has(locSolo)) {
    return 'Unknown';
  }

  const comp = company.trim();
  if (!comp) {
    return loc;
  }

  if (locSolo === comp.toLowerCase()) {
    return 'Unknown';
  }

  const words = comp.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length < 3) {
    return loc;
  }

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re =
    words.length === 1
      ? new RegExp(`\\b${escapeRe(words[0])}\\b`, 'gi')
      : new RegExp(`\\b${words.map(escapeRe).join('\\s+')}\\b`, 'gi');

  let out = loc.replace(re, ' ');
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;/|–-]+|[\s,;/|–-]+$/g, '')
    .trim();

  if (!out) {
    return loc;
  }
  return stripEmptyParentheses(out);
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
  const trimmed = stripEmptyParentheses(formattedRaw);
  const lower = trimmed.toLowerCase();
  const forFacets = !trimmed || lower === 'unknown' ? '' : trimmed;
  const facets = extractLocationFacets(forFacets);
  const hasGeo = facets.countries.length > 0 || facets.regions.length > 0;

  const sourceForClean = !trimmed || lower === 'unknown' ? 'Unknown' : trimmed;

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
