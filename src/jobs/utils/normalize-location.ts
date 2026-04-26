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
  'european union': 'eu',
  eu: 'eu',
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
  'sweden',
]);

const CITY_COUNTRY_HINTS: Record<string, string> = {
  belgrade: 'serbia',
  berlin: 'germany',
  paris: 'france',
  'san francisco': 'united states',
  'new york': 'united states',
  secaucas: 'united states',
  bloomington: 'united states',
  zurich: 'switzerland',
  frankfurt: 'germany',
  amsterdam: 'netherlands',
  bengaluru: 'india',
  praha: 'czechia',
  prague: 'czechia',
  warszawa: 'poland',
  atlanta: 'united states',
  'mexico city': 'mexico',
  seattle: 'united states',
  washington: 'united states',
  california: 'united states',
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\boffice\b/g, '')
    .replace(/\bremote\b\s*[-,:]?\s*/g, '')
    .replace(/\bnortheast\b\s*[-,:]?\s*/g, '')
    .replace(/\bsoutheast\b\s*[-,:]?\s*/g, '')
    .replace(/\bnorthwest\b\s*[-,:]?\s*/g, '')
    .replace(/\bsouthwest\b\s*[-,:]?\s*/g, '')
    .replace(/[.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitLocation(raw: string): string[] {
  return raw
    .split(/[;/|]/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
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
      tokens.add(bit);

      const mappedRegion = REGION_ALIASES[bit];
      if (mappedRegion) {
        regions.add(mappedRegion);
      }

      const mappedCountry = COUNTRY_ALIASES[bit] ?? bit;
      if (KNOWN_COUNTRIES.has(mappedCountry)) {
        countries.add(mappedCountry);
        tokens.add(mappedCountry);
      }

      const hintedCountry = CITY_COUNTRY_HINTS[bit];
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
