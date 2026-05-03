interface LocationFacets {
  tokens: string[];
  countries: string[];
  regions: string[];
}

const REGION_ALIASES: Record<string, string> = {
  apac: 'apac',
  emea: 'emea',
  latam: 'latam',
  americas: 'americas',
  'north america': 'north america',
  europe: 'europe',
  'european union': 'eu',
  eu: 'eu',
  'east coast': 'east coast',
  'west coast': 'west coast',
};

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'united states',
  us: 'united states',
  'united states of america': 'united states',
  uk: 'united kingdom',
  uae: 'united arab emirates',
  'czech republic': 'czechia',
  'south korea': 'south korea',
  'republic of korea': 'south korea',
  'russian federation': 'russia',
  'syrian arab republic': 'syria',
  türkiye: 'turkey',
  bosnia: 'bosnia and herzegovina',
  macedonia: 'north macedonia',
  'republic of north macedonia': 'north macedonia',
  "lao people's democratic republic": 'laos',
  'lao people’s democratic republic': 'laos',
  'lao pdr': 'laos',
  'u s': 'united states',
};

const KNOWN_COUNTRIES = new Set<string>([
  'united states',
  'united kingdom',
  'united arab emirates',
  'serbia',
  'germany',
  'france',
  'netherlands',
  'poland',
  'india',
  'switzerland',
  'south africa',
  'south korea',
  'czechia',
  'israel',
  'singapore',
  'japan',
  'australia',
  'canada',
  'colombia',
  'argentina',
  'mexico',
  'brazil',
  'finland',
  'denmark',
  'estonia',
  'sweden',
  'spain',
  'costa rica',
  'portugal',
  'armenia',
  'cyprus',
  'malta',
  'italy',
  'new zealand',
  'hong kong',
  'ireland',
  'belgium',
  'indonesia',
  'norway',
  'china',
  'vietnam',
  'ukraine',
  'peru',
  'uruguay',
  'panama',
  'dominican republic',
  'greece',
  'slovakia',
  'romania',
  'lithuania',
  'austria',
  'bulgaria',
  'sri lanka',
  'taiwan',
  'nigeria',
  'croatia',
  'kazakhstan',
  'philippines',
  'pakistan',
  'kenya',
  'saudi arabia',
  'ecuador',
  'paraguay',
  'el salvador',
  'honduras',
  'malaysia',
  'egypt',
  'jordan',
  'moldova',
  'nicaragua',
  'latvia',
  'morocco',
  'hungary',
  'georgia',
  'ghana',
  'guatemala',
  'chile',
  'bolivia',
  'russia',
  'venezuela',
  'jamaica',
  'albania',
  'libya',
  'tunisia',
  'syria',
  'rwanda',
  'namibia',
  'uganda',
  'belarus',
  'cambodia',
  'thailand',
  'bangladesh',
  'turkey',
  'bosnia and herzegovina',
  'north macedonia',
  'ethiopia',
  'montenegro',
  'papua new guinea',
  'luxembourg',
  'uzbekistan',
  'kyrgyzstan',
  'turkmenistan',
  'lebanon',
  'laos',
  'puerto rico',
  'gibraltar',
]);

/**
 * Common US city abbreviations → normalized city tokens (applied before state abbreviations).
 * `la` maps here so it means Los Angeles, not Louisiana’s postal code LA.
 */
const US_METRO_ABBREV_TO_TOKEN: Record<string, string> = {
  nyc: 'new york',
  la: 'los angeles',
  sf: 'san francisco',
};

/**
 * Two-letter US postal codes → lowercase state/region name for tokens (omit codes that
 * collide with English words or country names: ga, in, me, ok, or).
 */
const US_STATE_POSTAL_TO_TOKEN: Record<string, string> = {
  al: 'alabama',
  ak: 'alaska',
  az: 'arizona',
  ar: 'arkansas',
  ca: 'california',
  co: 'colorado',
  ct: 'connecticut',
  de: 'delaware',
  fl: 'florida',
  hi: 'hawaii',
  id: 'idaho',
  il: 'illinois',
  ia: 'iowa',
  ks: 'kansas',
  ky: 'kentucky',
  md: 'maryland',
  ma: 'massachusetts',
  mi: 'michigan',
  mn: 'minnesota',
  ms: 'mississippi',
  mo: 'missouri',
  mt: 'montana',
  ne: 'nebraska',
  nv: 'nevada',
  nh: 'new hampshire',
  nj: 'new jersey',
  nm: 'new mexico',
  ny: 'new york',
  nc: 'north carolina',
  nd: 'north dakota',
  oh: 'ohio',
  pa: 'pennsylvania',
  ri: 'rhode island',
  sc: 'south carolina',
  sd: 'south dakota',
  tn: 'tennessee',
  tx: 'texas',
  ut: 'utah',
  vt: 'vermont',
  va: 'virginia',
  wa: 'washington',
  wv: 'west virginia',
  wi: 'wisconsin',
  wy: 'wyoming',
  dc: 'district of columbia',
};

/**
 * Canadian province/territory postal abbreviations (lowercase) → region token.
 * US map is applied first; `on` is not a US state code so it resolves here for "City, ON".
 */
const CANADA_PROVINCE_POSTAL_TO_TOKEN: Record<string, string> = {
  ab: 'alberta',
  bc: 'british columbia',
  mb: 'manitoba',
  nb: 'new brunswick',
  nl: 'newfoundland and labrador',
  ns: 'nova scotia',
  nt: 'northwest territories',
  nu: 'nunavut',
  on: 'ontario',
  pe: 'prince edward island',
  qc: 'quebec',
  sk: 'saskatchewan',
  yt: 'yukon',
};

/** Extra geographic tokens to record when a city hint matches (e.g. known metro region). */
const EXTRA_TOKENS_FOR_CITY_HINT: Record<string, string[]> = {
  'redwood city': ['california'],
};

const CITY_COUNTRY_HINTS: Record<string, string> = {
  belgrade: 'serbia',
  berlin: 'germany',
  paris: 'france',
  'san francisco': 'united states',
  'los angeles': 'united states',
  'redwood city': 'united states',
  brooklyn: 'united states',
  'mountain view': 'united states',
  'new york': 'united states',
  'new york city': 'united states',
  'new jersey': 'united states',
  nj: 'united states',
  secaucas: 'united states',
  bloomington: 'united states',
  zurich: 'switzerland',
  frankfurt: 'germany',
  munich: 'germany',
  münchen: 'germany',
  amsterdam: 'netherlands',
  'são paulo': 'brazil',
  'sao paulo': 'brazil',
  bogota: 'colombia',
  bogotá: 'colombia',
  'santo domingo': 'dominican republic',
  bengaluru: 'india',
  jaipur: 'india',
  praha: 'czechia',
  prague: 'czechia',
  warszawa: 'poland',
  warsaw: 'poland',
  toronto: 'canada',
  atlanta: 'united states',
  'mexico city': 'mexico',
  seattle: 'united states',
  washington: 'united states',
  california: 'united states',
  bangalore: 'india',
  madrid: 'spain',
  milan: 'italy',
  dallas: 'united states',
  texas: 'united states',
  chicago: 'united states',
  illinois: 'united states',
  lisbon: 'portugal',
  yerevan: 'armenia',
  limassol: 'cyprus',
  birkirkara: 'malta',
  london: 'united kingdom',
  belfast: 'united kingdom',
  manchester: 'united kingdom',
  auckland: 'new zealand',
  sydney: 'australia',
  'hong kong': 'hong kong',
  galway: 'ireland',
  ghent: 'belgium',
  jakarta: 'indonesia',
  oslo: 'norway',
  shanghai: 'china',
  tokyo: 'japan',
  hanoi: 'vietnam',
  kyiv: 'ukraine',
  lima: 'peru',
  dublin: 'ireland',
  tallinn: 'estonia',
  sofia: 'bulgaria',
  bulgaria: 'bulgaria',
  colombo: 'sri lanka',
  taipei: 'taiwan',
  lagos: 'nigeria',
  abuja: 'nigeria',
  split: 'croatia',
  almaty: 'kazakhstan',
  cebu: 'philippines',
};

function normalizeToken(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/\banywhere\s+in\b/g, '')
    .replace(/\bhq\b/g, '')
    .replace(/\boffice\b/g, '')
    .replace(/\bremote\b\s*[-,:]?\s*/g, '')
    .replace(/\banywhere\b\s*[-,:]?\s*/g, '')
    .replace(/[.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')
    .trim();
}

/** Strips a leading "in " from a segment (e.g. "in France" → france). */
function stripLeadingInSegment(segment: string): string {
  return segment.replace(/^\s*in\s+/i, '').trim();
}

/** Expands parenthesized `A | B` or `(A, B)` lists so each item becomes its own segment. */
function expandParentheticalLists(raw: string): string {
  return raw.replace(/\(\s*([^)]+)\s*\)/g, (_, inner: string) => {
    let parts: string[];
    if (inner.includes('|')) {
      parts = inner
        .split('|')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } else if (inner.includes(',')) {
      parts = inner
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } else {
      return `(${inner})`;
    }
    if (parts.length === 0) {
      return '';
    }
    return `;${parts.join(';')}`;
  });
}

function normalizeKnownLocationPhrases(raw: string): string {
  return raw.replace(/\btechnological\s+pole\s+almada\b/gi, 'Lisbon, Portugal');
}

/** Split on ; | / and on spaced hyphens "Geo - Remote" so countries/regions parse. */
function splitLocation(raw: string): string[] {
  const segments: string[] = [];
  const expanded = expandParentheticalLists(normalizeKnownLocationPhrases(raw));
  const topLevel = expanded
    .split(/[;/|]/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  for (const chunk of topLevel) {
    const hyphenParts = chunk
      .split(/\s+[-–—]\s+/g)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    segments.push(...hyphenParts);
  }

  return segments;
}

export function extractLocationFacets(rawLocation: string): LocationFacets {
  const countries = new Set<string>();
  const regions = new Set<string>();
  const tokens = new Set<string>();

  const parts = splitLocation(rawLocation);
  for (const part of parts) {
    const normalizedPart = normalizeToken(part);
    if (!normalizedPart) {
      continue;
    }

    const commaBits = normalizedPart
      .split(',')
      .map((bit) => bit.trim())
      .filter((bit) => bit.length > 0);

    for (const bit of commaBits.length > 0 ? commaBits : [normalizedPart]) {
      const trimmedBit = stripLeadingInSegment(
        bit.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim(),
      );
      if (!trimmedBit) {
        continue;
      }

      const facetKey =
        US_METRO_ABBREV_TO_TOKEN[trimmedBit] ??
        US_STATE_POSTAL_TO_TOKEN[trimmedBit] ??
        CANADA_PROVINCE_POSTAL_TO_TOKEN[trimmedBit] ??
        trimmedBit;
      tokens.add(facetKey);

      const mappedRegion = REGION_ALIASES[facetKey];
      if (mappedRegion) {
        regions.add(mappedRegion);
      }

      const mappedCountry = COUNTRY_ALIASES[facetKey] ?? facetKey;
      if (KNOWN_COUNTRIES.has(mappedCountry)) {
        countries.add(mappedCountry);
        tokens.add(mappedCountry);
      }

      const hintedCountry = CITY_COUNTRY_HINTS[facetKey];
      if (hintedCountry) {
        countries.add(hintedCountry);
        tokens.add(hintedCountry);
        const extraTokens = EXTRA_TOKENS_FOR_CITY_HINT[facetKey];
        if (extraTokens) {
          for (const extra of extraTokens) {
            tokens.add(extra);
          }
        }
      }
    }
  }

  return {
    tokens: Array.from(tokens),
    countries: Array.from(countries),
    regions: Array.from(regions),
  };
}
