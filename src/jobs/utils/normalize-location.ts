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
]);

const CITY_COUNTRY_HINTS: Record<string, string> = {
  belgrade: 'serbia',
  berlin: 'germany',
  paris: 'france',
  'san francisco': 'united states',
  'new york': 'united states',
  nyc: 'united states',
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
  manchester: 'united kingdom',
  auckland: 'new zealand',
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
  gibraltar: 'united kingdom',
  'puerto rico': 'united states',
};

function normalizeToken(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/\boffice\b/g, '')
    .replace(/\bremote\b\s*[-,:]?\s*/g, '')
    .replace(/\banywhere\b\s*[-,:]?\s*/g, '')
    .replace(/[.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')
    .trim();
}

/** Expands parenthesized `A | B` lists so each item becomes its own split segment. */
function expandParentheticalPipeLists(raw: string): string {
  return raw.replace(/\(\s*([^)]+)\s*\)/g, (_, inner: string) => {
    if (!inner.includes('|')) {
      return `(${inner})`;
    }
    const parts = inner
      .split('|')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length === 0) {
      return '';
    }
    return `;${parts.join(';')}`;
  });
}

/** Split on ; | / and on spaced hyphens "Geo - Remote" so countries/regions parse. */
function splitLocation(raw: string): string[] {
  const segments: string[] = [];
  const expanded = expandParentheticalPipeLists(raw);
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
      const trimmedBit = bit.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim();
      if (!trimmedBit) {
        continue;
      }
      tokens.add(trimmedBit);

      const mappedRegion = REGION_ALIASES[trimmedBit];
      if (mappedRegion) {
        regions.add(mappedRegion);
      }

      const mappedCountry = COUNTRY_ALIASES[trimmedBit] ?? trimmedBit;
      if (KNOWN_COUNTRIES.has(mappedCountry)) {
        countries.add(mappedCountry);
        tokens.add(mappedCountry);
      }

      const hintedCountry = CITY_COUNTRY_HINTS[trimmedBit];
      if (hintedCountry) {
        countries.add(hintedCountry);
        tokens.add(hintedCountry);
      }
    }
  }

  return {
    tokens: Array.from(tokens),
    countries: Array.from(countries),
    regions: Array.from(regions),
  };
}
