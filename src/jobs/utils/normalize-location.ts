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
};

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
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\boffice\b/g, '')
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
      if (
        mappedCountry.includes('united') ||
        mappedCountry.includes('kingdom') ||
        mappedCountry.includes('serbia') ||
        mappedCountry.includes('germany') ||
        mappedCountry.includes('france') ||
        mappedCountry.includes('netherlands') ||
        mappedCountry.includes('poland') ||
        mappedCountry.includes('india') ||
        mappedCountry.includes('switzerland') ||
        mappedCountry.includes('south africa') ||
        mappedCountry.includes('czechia') ||
        mappedCountry.includes('israel') ||
        mappedCountry.includes('singapore') ||
        mappedCountry.includes('japan') ||
        mappedCountry.includes('australia') ||
        mappedCountry.includes('canada')
      ) {
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
