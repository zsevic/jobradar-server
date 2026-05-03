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
  /** Corporate shorthand for Americas (e.g. jobs tagged AMER / Americas region). */
  amer: 'americas',
  namer: 'north america',
  'north america': 'north america',
  europe: 'europe',
  'european union': 'eu',
  eu: 'eu',
  'east coast': 'east coast',
  'west coast': 'west coast',
  africa: 'africa',
};

/** Lowercase; matches `Intl.DisplayNames(['en'], { type: 'region' }).of('CI').toLowerCase()` (d’Ivoire uses U+2019). */
const COTE_DIVOIRE = 'côte d\u2019ivoire';

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
  korea: 'south korea',
  phillipines: 'philippines',
  'ivory coast': COTE_DIVOIRE,
  "cote d'ivoire": COTE_DIVOIRE,
  "côte d'ivoire": COTE_DIVOIRE,
  'congo brazzaville': 'congo - brazzaville',
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
  'slovenia',
  'romania',
  'lithuania',
  'austria',
  'azerbaijan',
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
  'andorra',
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
  COTE_DIVOIRE,
  'senegal',
  'cameroon',
  'mali',
  'benin',
  'congo - brazzaville',
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
  'bay area': ['san francisco', 'california'],
  emeryville: ['california'],
  sunnyvale: ['california'],
  'san jose': ['california'],
  'palo alto': ['california'],
  'san mateo': ['california'],
  'santa clara': ['california'],
  hawthorne: ['california'],
  'mountain view': ['california'],
  bellevue: ['washington'],
  redmond: ['washington'],
  woodinville: ['washington'],
  'huntington beach': ['california'],
  'las vegas': ['nevada'],
  gilbert: ['arizona'],
  'new albany': ['ohio'],
  pittsburgh: ['pennsylvania'],
  denver: ['colorado'],
  woburn: ['massachusetts'],
  bastrop: ['texas'],
  mcgregor: ['texas'],
  starbase: ['texas'],
  'cape canaveral': ['florida'],
  arlington: ['virginia'],
  chantilly: ['virginia'],
  'annapolis junction': ['maryland'],
  lehi: ['utah'],
};

const CITY_COUNTRY_HINTS: Record<string, string> = {
  belgrade: 'serbia',
  berlin: 'germany',
  paris: 'france',
  'san francisco': 'united states',
  'los angeles': 'united states',
  'redwood city': 'united states',
  emeryville: 'united states',
  sunnyvale: 'united states',
  brooklyn: 'united states',
  'mountain view': 'united states',
  'new york': 'united states',
  'new jersey': 'united states',
  nj: 'united states',
  secaucas: 'united states',
  bloomington: 'united states',
  zurich: 'switzerland',
  frankfurt: 'germany',
  munich: 'germany',
  münchen: 'germany',
  amsterdam: 'netherlands',
  alkmaar: 'netherlands',
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
  utah: 'united states',
  chicago: 'united states',
  illinois: 'united states',
  'san jose': 'united states',
  'palo alto': 'united states',
  'san mateo': 'united states',
  'santa clara': 'united states',
  hawthorne: 'united states',
  bellevue: 'united states',
  redmond: 'united states',
  woodinville: 'united states',
  'huntington beach': 'united states',
  'las vegas': 'united states',
  gilbert: 'united states',
  'new albany': 'united states',
  pittsburgh: 'united states',
  denver: 'united states',
  boston: 'united states',
  austin: 'united states',
  woburn: 'united states',
  bastrop: 'united states',
  mcgregor: 'united states',
  starbase: 'united states',
  'cape canaveral': 'united states',
  arlington: 'united states',
  chantilly: 'united states',
  'annapolis junction': 'united states',
  lehi: 'united states',
  vilnius: 'lithuania',
  stockholm: 'sweden',
  budapest: 'hungary',
  barcelona: 'spain',
  lausanne: 'switzerland',
  manila: 'philippines',
  curitiba: 'brazil',
  helsinki: 'finland',
  'cape town': 'south africa',
  gurugram: 'india',
  pune: 'india',
  shenzhen: 'china',
  beijing: 'china',
  lisbon: 'portugal',
  yerevan: 'armenia',
  limassol: 'cyprus',
  birkirkara: 'malta',
  london: 'united kingdom',
  belfast: 'united kingdom',
  manchester: 'united kingdom',
  basingstoke: 'united kingdom',
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
  minsk: 'belarus',
  seoul: 'south korea',
  'kuala lumpur': 'malaysia',
  bucharest: 'romania',
  krakow: 'poland',
  kraków: 'poland',
  heidelberg: 'germany',
  'menlo park': 'united states',
  nairobi: 'kenya',
  'buenos aires': 'argentina',
  'san luis obispo': 'united states',
  phoenix: 'united states',
  reading: 'united kingdom',
  lima: 'peru',
  dublin: 'ireland',
  tallinn: 'estonia',
  sofia: 'bulgaria',
  bulgaria: 'bulgaria',
  colombo: 'sri lanka',
  taipei: 'taiwan',
  lagos: 'nigeria',
  'abu dhabi': 'united arab emirates',
  dubai: 'united arab emirates',
  'tel aviv': 'israel',
  abuja: 'nigeria',
  abidjan: COTE_DIVOIRE,
  dakar: 'senegal',
  douala: 'cameroon',
  bamako: 'mali',
  split: 'croatia',
  almaty: 'kazakhstan',
  cebu: 'philippines',
  'bay area': 'united states',
};

/** Single generic English tokens that can precede geography but are not employer names. */
const PREFIX_WORD_BLOCKLIST = new Set([
  'research',
  'sales',
  'marketing',
  'engineering',
  'product',
  'operations',
  'north',
  'south',
  'east',
  'west',
  'greater',
  'metro',
  'central',
  'upper',
  'lower',
  'new',
  'old',
]);

function buildSortedGeoSuffixCandidates(): string[] {
  const set = new Set<string>();
  for (const c of KNOWN_COUNTRIES) {
    set.add(c);
  }
  for (const v of Object.values(COUNTRY_ALIASES)) {
    set.add(v);
  }
  for (const key of Object.keys(CITY_COUNTRY_HINTS)) {
    if (key.length >= 4 || key.includes(' ')) {
      set.add(key);
    }
  }
  for (const k of Object.keys(REGION_ALIASES)) {
    set.add(k);
  }
  for (const v of Object.values(REGION_ALIASES)) {
    set.add(v);
  }
  for (const v of Object.values(US_STATE_POSTAL_TO_TOKEN)) {
    set.add(v);
  }
  for (const v of Object.values(CANADA_PROVINCE_POSTAL_TO_TOKEN)) {
    set.add(v);
  }
  return Array.from(set).sort((a, b) => b.length - a.length);
}

const SORTED_GEO_SUFFIXES = buildSortedGeoSuffixCandidates();

function collapseEmployerNoiseSpaces(s: string): string {
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;/|–\-]+/g, '')
    .trim();
}

function geoHintWordsInSegment(s: string): boolean {
  const lower = s.toLowerCase();
  if (/\b(united states|united kingdom|south korea|north macedonia|new zealand|hong kong)\b/.test(lower)) {
    return true;
  }
  for (const w of lower.split(/\s+/).filter(Boolean)) {
    if (KNOWN_COUNTRIES.has(w)) {
      return true;
    }
    if (CITY_COUNTRY_HINTS[w]) {
      return true;
    }
    if (REGION_ALIASES[w]) {
      return true;
    }
    const mapped = COUNTRY_ALIASES[w as keyof typeof COUNTRY_ALIASES];
    if (mapped && KNOWN_COUNTRIES.has(mapped)) {
      return true;
    }
  }
  return false;
}

function shouldSkipSuffixPeel(prefix: string, suffix: string): boolean {
  const p = prefix.toLowerCase();
  const s = suffix.toLowerCase();
  if (s === 'california' && /^baja\b/.test(p)) {
    return true;
  }
  if (s === 'york' && /\bnew\b/.test(p)) {
    return true;
  }
  if (s === 'jersey' && /\bnew\b/.test(p)) {
    return true;
  }
  if (s === 'mexico' && /\bnew\b/.test(p)) {
    return true;
  }
  return false;
}

function isLikelyEmployerPrefix(prefix: string): boolean {
  const pk = prefix.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!pk) {
    return false;
  }
  // Multi-segment listings (e.g. "Germany | Helsinki") are not "CompanyName + city".
  if (/[|;/]/.test(pk)) {
    return false;
  }
  if (pk.includes(',')) {
    return false;
  }
  const words = pk.split(/\s+/);
  if (words.length > 5) {
    return false;
  }
  if (CITY_COUNTRY_HINTS[pk]) {
    return false;
  }
  if (REGION_ALIASES[pk]) {
    return false;
  }
  if (KNOWN_COUNTRIES.has(pk)) {
    return false;
  }
  for (const key of Object.keys(CITY_COUNTRY_HINTS)) {
    if (key.includes(' ') && pk === key) {
      return false;
    }
  }
  if (words.length === 1 && PREFIX_WORD_BLOCKLIST.has(words[0])) {
    return false;
  }
  return true;
}

function applyHyphenEmployerBrandSplit(t: string): string {
  const parts = t.split(/\s+[-–—]\s+/);
  if (parts.length < 2) {
    return t;
  }
  const left = parts[0].trim();
  const right = parts.slice(1).join(' - ').trim();
  if (!left || !right) {
    return t;
  }
  if (
    /[,]/.test(left) &&
    !/\b(headquarters|hq|campus|home\s+office)\b/i.test(left)
  ) {
    return t;
  }
  const leftCorp = /\b(headquarters|hq|campus|home\s+office)\b/i.test(left);
  const rightGeo =
    /[,]/.test(right) ||
    /\([^)]+\)/.test(right) ||
    /\b(remote|hybrid|distributed|worldwide)\b/i.test(right) ||
    geoHintWordsInSegment(right);
  if (leftCorp || rightGeo) {
    return right;
  }
  return t;
}

function applySuffixEmployerBrandPeel(t: string): string {
  const lower = t.toLowerCase();
  for (const suffix of SORTED_GEO_SUFFIXES) {
    const sl = suffix.toLowerCase();
    if (sl.length < 4 && !sl.includes(' ')) {
      continue;
    }
    const idx = lower.lastIndexOf(sl);
    if (idx === -1) {
      continue;
    }
    if (idx !== lower.length - sl.length) {
      continue;
    }
    if (idx > 0 && lower[idx - 1] !== ' ') {
      continue;
    }
    const prefix = t.slice(0, idx).trim();
    if (!prefix) {
      continue;
    }
    if (shouldSkipSuffixPeel(prefix, suffix)) {
      continue;
    }
    if (!isLikelyEmployerPrefix(prefix)) {
      continue;
    }
    return t.slice(idx).trim();
  }
  return t;
}

/**
 * Removes leading employer / listing noise so country & city tokens reflect geography only.
 * Heuristics: `Brand — Place`, `Brand Place` when Place matches known geo (not Mapbox-specific).
 */
function stripEmployerBrandFromLocation(raw: string): string {
  let t = raw.trim();
  if (!t) {
    return t;
  }
  t = applyHyphenEmployerBrandSplit(t);
  t = t.trim();
  if (!t) {
    return t;
  }
  if (/,/.test(t)) {
    return collapseEmployerNoiseSpaces(t);
  }
  t = applySuffixEmployerBrandPeel(t);
  return collapseEmployerNoiseSpaces(t);
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/^\*?\s*hq\b\s*(?:[\-–—:,]+\s*)?/g, '')
    .replace(/\banywhere\s+in\b/g, '')
    .replace(/\bhq\b/g, '')
    .replace(/\b(headquarters|head\s+office)\b/g, '')
    .replace(/\s+labs\s*$/gi, '')
    .replace(/\bin\s*[- ]?\s*office\b/g, '')
    .replace(/\boffice\b/g, '')
    .replace(/\b(hybrid|onsite)\b/g, '')
    .replace(/\bm\s*,\s*w\s*,\s*f\b/gi, '')
    .replace(/\bm\s+w\s+f\b/gi, '')
    .replace(/\bremote\b\s*[-,:]?\s*/g, '')
    .replace(/\banywhere\b\s*[-,:]?\s*/g, '')
    .replace(/[.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')
    .replace(/\s+\bin\s*$/g, '')
    .trim();
}

/** Strips a leading "in " from a segment (e.g. "in France" → france). */
function stripLeadingInSegment(segment: string): string {
  return segment.replace(/^\s*in\s+/i, '').trim();
}

/**
 * Expands parenthesized lists: `A | B`, `(A, B)`, or `(A or B)` so each item is its own
 * top-level segment (e.g. `Remote (U.S. or Europe)`).
 */
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
    } else if (/\s+or\s+/i.test(inner)) {
      parts = inner
        .split(/\s+or\s+/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } else {
      // Single token / phrase: unwrap so e.g. `Remote (USA)` → `Remote USA`, `(Lehi, UT)` uses comma branch above.
      return ` ${inner.trim()} `;
    }
    if (parts.length === 0) {
      return '';
    }
    return `;${parts.join(';')}`;
  });
}

function normalizeKnownLocationPhrases(raw: string): string {
  return stripEmployerBrandFromLocation(raw)
    .replace(
      /\bdistributed\s*\(\s*([^)]+)\s*\)/gi,
      (_m, inner: string) => inner.trim(),
    )
    .replace(/\bphillipines\b/gi, 'Philippines')
    .replace(/\bae\s*[-–—]\s*dubai\b/gi, 'Dubai')
    .replace(/\bca\s*[-–—]\s*toronto\b/gi, 'Toronto, Canada')
    .replace(/\bil\s*[-–—]\s*tel\s+aviv\b/gi, 'Tel Aviv, Israel')
    .replace(/\bsg\s*[-–—]\s*singapore\b/gi, 'Singapore')
    .replace(/\bhk\s*[-–—]\s*hong\s+kong(?:\s+SAR)?\b/gi, 'Hong Kong')
    .replace(/\bhong\s+kong\s+SAR\b/gi, 'Hong Kong')
    .replace(/\buk\s*[-–—]\s*london\b/gi, 'London, United Kingdom')
    .replace(/\bus\s*[-–—]\s*san\s+francisco\b/gi, 'San Francisco, California')
    .replace(/\bus\s*[-–—]\s*san\s+jose\b/gi, 'San Jose, California')
    .replace(/\bindia\s*[-–—]\s*pune\b/gi, 'Pune, India')
    .replace(/\blimassol\s+cyprus\b/gi, 'Limassol, Cyprus')
    .replace(/\btechnological\s+pole\s+almada\b/gi, 'Lisbon, Portugal')
    .replace(/\bsan\s+francisco\s+bay\s+area\b/gi, 'Bay Area')
    .replace(/\bcongo\s*,?\s*brazzaville\b/gi, 'Congo - Brazzaville')
    .replace(/\bnew\s+york\s+city\s+area\b/gi, 'New York')
    .replace(/\bnew\s+york\s+city\b/gi, 'New York')
    .replace(/,\s*ca\s+united\s+states\b/gi, ', CA, United States')
    .replace(/\busa\s+-\s*remote\b/gi, 'United States')
    .replace(/\bremote\s+-\s*us\s*&?\s*canada\b/gi, 'United States, Canada')
    .replace(/\bunited\s+states\s*\(\s*remote\s*\)/gi, 'United States')
    .replace(/\bcanada\s*\(\s*hybrid\s*\)\b/gi, 'Canada')
    .replace(/\bremote\s*\(\s*canada\s*\)/gi, 'Canada')
    .replace(/^\s*\(\s*can\s*\)\s*$/gi, 'Canada')
    .replace(/^\s*united\s*$/gi, 'United States')
    .replace(/\bchina\s*[-–—]\s*shanghai\b/gi, 'Shanghai, China')
    .replace(/\bindia\s*[-–—]\s*karnataka\b/gi, 'Karnataka, India')
    .replace(/\s*[-–—]\s*fully\s+remote\b/gi, '')
    .replace(/\bremote\s+in\s+the\s+(usa|us)\b/gi, 'United States')
    .replace(/\bus\s*[-–—]\s*distributed\b/gi, 'United States')
    .replace(/\bus\s*[-–—]\s*illinois\b/gi, 'Illinois, United States')
    .replace(/\bwashington\s+dc\b/gi, 'Washington, DC')
    .replace(/\breading\s*\(\s*london\s*\)/gi, 'Reading, United Kingdom')
    .replace(/\b([a-z0-9]+)\s*\(\s*can\s*\)/gi, '$1, Canada');
}

/** Split on ; | /, spaced hyphens, and " or " so alternatives become separate segments. */
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
    for (const hyphenPart of hyphenParts) {
      const orParts = hyphenPart
        .split(/\s+or\s+/i)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      segments.push(...orParts);
    }
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
