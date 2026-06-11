interface LocationFacets {
  tokens: string[];
  countries: string[];
  regions: string[];
}

const REGION_ALIASES: Record<string, string> = {
  apac: 'apac',
  emea: 'emea',
  latam: 'latin america',
  /** Corporate / ATS listing for Latin America. */
  'latin america': 'latin america',
  /** North America (corporate tag). */
  noram: 'north america',
  nordics: 'nordics',
  iberia: 'iberia',
  /** Germany–Austria–Switzerland corporate cluster. */
  dach: 'dach',
  /** Middle East & North Africa (corporate region tag). */
  mena: 'mena',
  americas: 'americas',
  /** Corporate shorthand for Americas (e.g. jobs tagged AMER / Americas region). */
  amer: 'americas',
  namer: 'north america',
  'north america': 'north america',
  'south america': 'south america',
  asia: 'asia',
  europe: 'europe',
  /** Political/economic bloc — keep long-form canonical token. */
  'european union': 'european union',
  eu: 'european union',
  'east coast': 'east coast',
  'west coast': 'west coast',
  africa: 'africa',
  /** Corporate catch-all (e.g. `Global Remote` after token cleanup). */
  global: 'global',
  worldwide: 'worldwide',
  /** US federal / military macro (DMV). */
  'national capital region': 'east coast',
  /** US zone tags. */
  'northeastern us': 'east coast',
  'ohio valley': 'central us',
  'mountain west': 'mountain west',
  'southeast us': 'east coast',
  /** ATS phrasing variant of `southeast us`. */
  'southeastern us': 'east coast',
  /** Job-board “Eastern US” remote zones. */
  'eastern us': 'east coast',
  /** ATS phrasing variant (e.g. `US East Coast`). */
  'us east coast': 'east coast',
  /** Corporate listings (e.g. `West, US Region`). */
  'west us region': 'west coast',
  'central america': 'central america',
  'middle east': 'middle east',
  'central asia': 'central asia',
  'east asia': 'east asia',
  'southeast asia': 'southeast asia',
  'central us': 'central us',
  /** Corporate remote macro-regions. */
  'northeast asia': 'northeast asia',
  cis: 'cis',
  /** Macro-region (jobs boards). */
  'south-central asia': 'south-central asia',
};

/** Lowercase; matches `Intl.DisplayNames(['en'], { type: 'region' }).of('CI').toLowerCase()` (d’Ivoire uses U+2019). */
const COTE_DIVOIRE = 'côte d\u2019ivoire';

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'united states',
  us: 'united states',
  can: 'canada',
  'u.s.a': 'united states',
  'u.s': 'united states',
  'united states of america': 'united states',
  uk: 'united kingdom',
  england: 'united kingdom',
  scotland: 'united kingdom',
  'great britain': 'united kingdom',
  uae: 'united arab emirates',
  'czech republic': 'czechia',
  cze: 'czechia',
  'viet nam': 'vietnam',
  'south korea': 'south korea',
  'republic of korea': 'south korea',
  "people's republic of china": 'china',
  'people’s republic of china': 'china',
  'russian federation': 'russia',
  'syrian arab republic': 'syria',
  türkiye: 'turkey',
  bosnia: 'bosnia & herzegovina',
  'bosnia and herzegovina': 'bosnia & herzegovina',
  'bosnia & herzegovina': 'bosnia & herzegovina',
  macedonia: 'north macedonia',
  'republic of north macedonia': 'north macedonia',
  "lao people's democratic republic": 'laos',
  'lao people’s democratic republic': 'laos',
  'lao pdr': 'laos',
  'u s': 'united states',
  korea: 'south korea',
  brasil: 'brazil',
  méxico: 'mexico',
  ind: 'india',
  irl: 'ireland',
  singapoor: 'singapore',
  philipines: 'philippines',
  phillipines: 'philippines',
  'ivory coast': COTE_DIVOIRE,
  "cote d'ivoire": COTE_DIVOIRE,
  "côte d'ivoire": COTE_DIVOIRE,
  cayman: 'cayman islands',
  'congo brazzaville': 'congo - brazzaville',
  'republic of the congo': 'congo - brazzaville',
  'democratic republic of congo': 'congo - kinshasa',
  deutschland: 'germany',
  'costa rice': 'costa rica',
  /** ISO 3166-1 alpha-2 in ATS strings (e.g. `Zürich, CH`). */
  ch: 'switzerland',
  /** Common ATS typos. */
  'united state': 'united states',
  'unites states': 'united states',
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
  'nepal',
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
  'bosnia & herzegovina',
  'bermuda',
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
  'congo - kinshasa',
  'algeria',
  'mauritius',
  'brunei',
  'oman',
  'mongolia',
  'madagascar',
  'san marino',
  'haiti',
  'qatar',
  'iceland',
  'kuwait',
  'kosovo',
  'seychelles',
  'cayman islands',
]);

/** Longest first so e.g. `united kingdom` wins over `india` when matching suffixes. */
const KNOWN_COUNTRY_PHRASES_SORTED = [...KNOWN_COUNTRIES].sort(
  (a, b) => b.length - a.length,
);

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
 * collide with English words or country names: in, me, ok, or).
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
  ga: 'georgia',
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

/** US state / DC full tokens (values of {@link US_STATE_POSTAL_TO_TOKEN}) → imply `united states` when not a country name. */
const US_STATE_NAME_SET = new Set<string>(
  Object.values(US_STATE_POSTAL_TO_TOKEN),
);

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

/** Canadian province/territory full tokens → imply `canada`. */
const CANADA_PROVINCE_NAME_SET = new Set<string>(
  Object.values(CANADA_PROVINCE_POSTAL_TO_TOKEN),
);

const US_STATE_FULL_NAMES_SORTED = [...US_STATE_NAME_SET].sort(
  (a, b) => b.length - a.length,
);

/** Two-letter {@link COUNTRY_ALIASES} keys that are not US / CA province postals (e.g. `uk`, `ch`). */
const ISO2_COUNTRY_SUFFIX_KEYS = new Set(
  Object.keys(COUNTRY_ALIASES).filter(
    (k) =>
      k.length === 2 &&
      !Object.prototype.hasOwnProperty.call(US_STATE_POSTAL_TO_TOKEN, k) &&
      !Object.prototype.hasOwnProperty.call(CANADA_PROVINCE_POSTAL_TO_TOKEN, k),
  ),
);

/** Avoid splitting region names like `South Australia` into `south` + `australia`. */
const AUSTRALIAN_STATE_LEADING_TOKEN_BLOCKLIST = new Set([
  'south',
  'western',
  'northern',
  'tasmanian',
]);

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
  'orange county': ['california'],
  'huntington beach': ['california'],
  'las vegas': ['nevada'],
  gilbert: ['arizona'],
  'new albany': ['ohio'],
  pittsburgh: ['pennsylvania'],
  denver: ['colorado'],
  woburn: ['massachusetts'],
  bastrop: ['texas'],
  'fort worth': ['texas'],
  mcgregor: ['texas'],
  starbase: ['texas'],
  'cape canaveral': ['florida'],
  'foster city': ['california'],
  arlington: ['virginia'],
  chantilly: ['virginia'],
  'annapolis junction': ['maryland'],
  lehi: ['utah'],
  hillsboro: ['oregon'],
  omaha: ['nebraska'],
  'san antonio': ['texas'],
  northlake: ['illinois'],
  walnut: ['california'],
  'glen cove': ['new york'],
  orlando: ['florida'],
  oxnard: ['california'],
  plano: ['texas'],
  calgary: ['alberta'],
  'oklahoma city': ['oklahoma'],
  'offenbach am main': ['hessen'],
  memphis: ['tennessee'],
  portland: ['oregon'],
  jacksonville: ['florida'],
  'kansas city': ['missouri'],
  louisville: ['kentucky'],
  miami: ['florida'],
  milwaukee: ['wisconsin'],
  'new orleans': ['louisiana'],
  newark: ['new jersey'],
  'virginia beach': ['virginia'],
  wichita: ['kansas'],
  'old greenwich': ['connecticut'],
  tysons: ['virginia'],
  mojave: ['california'],
  marietta: ['georgia'],
  metairie: ['louisiana'],
  frisco: ['texas'],
  reston: ['virginia'],
  sterling: ['virginia'],
};

const CITY_COUNTRY_HINTS: Record<string, string> = {
  cambridge: 'united kingdom',
  copenhagen: 'denmark',
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
  concord: 'united states',
  indiana: 'united states',
  'new jersey': 'united states',
  nj: 'united states',
  secaucas: 'united states',
  bloomington: 'united states',
  zurich: 'switzerland',
  zürich: 'switzerland',
  geneva: 'switzerland',
  genève: 'switzerland',
  frankfurt: 'germany',
  dortmund: 'germany',
  duisburg: 'germany',
  dusseldorf: 'germany',
  düsseldorf: 'germany',
  essen: 'germany',
  bavaria: 'germany',
  hamburg: 'germany',
  munich: 'germany',
  münchen: 'germany',
  köln: 'germany',
  cologne: 'germany',
  amsterdam: 'netherlands',
  alkmaar: 'netherlands',
  hilversum: 'netherlands',
  haarlem: 'netherlands',
  rotterdam: 'netherlands',
  randstad: 'netherlands',
  'the randstad': 'netherlands',
  'são paulo': 'brazil',
  'sao paulo': 'brazil',
  bogota: 'colombia',
  bogotá: 'colombia',
  'santo domingo': 'dominican republic',
  bengaluru: 'india',
  noida: 'india',
  hyderabad: 'india',
  mumbai: 'india',
  thiruvananthapuram: 'india',
  jaipur: 'india',
  praha: 'czechia',
  prague: 'czechia',
  warszawa: 'poland',
  warsaw: 'poland',
  toronto: 'canada',
  vancouver: 'canada',
  atlanta: 'united states',
  'mexico city': 'mexico',
  monterrey: 'mexico',
  seattle: 'united states',
  washington: 'united states',
  california: 'united states',
  bangalore: 'india',
  'new delhi': 'india',
  madrid: 'spain',
  malaga: 'spain',
  málaga: 'spain',
  milan: 'italy',
  pisa: 'italy',
  rome: 'italy',
  dallas: 'united states',
  houston: 'united states',
  'fort worth': 'united states',
  texas: 'united states',
  utah: 'united states',
  chicago: 'united states',
  cincinnati: 'united states',
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
  'new kensington': 'united states',
  denver: 'united states',
  nashville: 'united states',
  shreveport: 'united states',
  'san diego': 'united states',
  hillsboro: 'united states',
  boston: 'united states',
  austin: 'united states',
  bentonville: 'united states',
  woburn: 'united states',
  bastrop: 'united states',
  mcgregor: 'united states',
  starbase: 'united states',
  'cape canaveral': 'united states',
  arlington: 'united states',
  chantilly: 'united states',
  herndon: 'united states',
  'annapolis junction': 'united states',
  lehi: 'united states',
  vilnius: 'lithuania',
  kaunas: 'lithuania',
  ljubljana: 'slovenia',
  marseille: 'france',
  nantes: 'france',
  nancy: 'france',
  lille: 'france',
  lyon: 'france',
  nice: 'france',
  metz: 'france',
  montpellier: 'france',
  strasbourg: 'france',
  orléans: 'france',
  orleans: 'france',
  montreal: 'canada',
  montréal: 'canada',
  detroit: 'united states',
  oklahoma: 'united states',
  'orange county': 'united states',
  borlange: 'sweden',
  borlänge: 'sweden',
  'foster city': 'united states',
  stockholm: 'sweden',
  malmö: 'sweden',
  malmo: 'sweden',
  budapest: 'hungary',
  barcelona: 'spain',
  lausanne: 'switzerland',
  manila: 'philippines',
  curitiba: 'brazil',
  helsinki: 'finland',
  tampere: 'finland',
  turku: 'finland',
  oulu: 'finland',
  hobart: 'australia',
  'cape town': 'south africa',
  johannesburg: 'south africa',
  durban: 'south africa',
  dundee: 'united kingdom',
  cardiff: 'united kingdom',
  guildford: 'united kingdom',
  taranaki: 'new zealand',
  chennai: 'india',
  'tamil nadu': 'india',
  clark: 'philippines',
  gurugram: 'india',
  gurgaon: 'india',
  pune: 'india',
  shenzhen: 'china',
  hangzhou: 'china',
  beijing: 'china',
  lisbon: 'portugal',
  lisboa: 'portugal',
  istanbul: 'turkey',
  yerevan: 'armenia',
  limassol: 'cyprus',
  nicosia: 'cyprus',
  paphos: 'cyprus',
  baku: 'azerbaijan',
  birkirkara: 'malta',
  london: 'united kingdom',
  belfast: 'united kingdom',
  manchester: 'united kingdom',
  edinburgh: 'united kingdom',
  glasgow: 'united kingdom',
  basingstoke: 'united kingdom',
  liverpool: 'united kingdom',
  auckland: 'new zealand',
  sydney: 'australia',
  'hong kong': 'hong kong',
  galway: 'ireland',
  ghent: 'belgium',
  jakarta: 'indonesia',
  oslo: 'norway',
  reykjavik: 'iceland',
  reykjavík: 'iceland',
  shanghai: 'china',
  macau: 'china',
  tokyo: 'japan',
  fukuoka: 'japan',
  hanoi: 'vietnam',
  'ho chi minh': 'vietnam',
  'ho chi minh city': 'vietnam',
  kyiv: 'ukraine',
  kiev: 'ukraine',
  dnipro: 'ukraine',
  minsk: 'belarus',
  seoul: 'south korea',
  'kuala lumpur': 'malaysia',
  bucharest: 'romania',
  cluj: 'romania',
  krakow: 'poland',
  kraków: 'poland',
  heidelberg: 'germany',
  erding: 'germany',
  'menlo park': 'united states',
  nairobi: 'kenya',
  connacht: 'ireland',
  corby: 'united kingdom',
  darmstadt: 'germany',
  recklinghausen: 'germany',
  stuttgart: 'germany',
  hannover: 'germany',
  kassel: 'germany',
  mainz: 'germany',
  nürnberg: 'germany',
  nuremberg: 'germany',
  münster: 'germany',
  munster: 'germany',
  'buenos aires': 'argentina',
  'rio de janeiro': 'brazil',
  'são josé dos campos': 'brazil',
  'sao jose dos campos': 'brazil',
  montevideo: 'uruguay',
  brazzaville: 'congo - brazzaville',
  lubumbashi: 'congo - kinshasa',
  birmingham: 'united kingdom',
  bochum: 'germany',
  bonn: 'germany',
  bristol: 'united kingdom',
  caen: 'france',
  cairo: 'egypt',
  canberra: 'australia',
  'new south wales': 'australia',
  queensland: 'australia',
  'south australia': 'australia',
  manawatu: 'new zealand',
  'bay of plenty': 'new zealand',
  waikato: 'new zealand',
  brussels: 'belgium',
  brussel: 'belgium',
  boise: 'united states',
  ahmedabad: 'india',
  aichi: 'japan',
  annecy: 'france',
  athens: 'greece',
  bangkok: 'thailand',
  bayreuth: 'germany',
  augusta: 'united states',
  'san luis obispo': 'united states',
  phoenix: 'united states',
  indianapolis: 'united states',
  memphis: 'united states',
  portland: 'united states',
  jacksonville: 'united states',
  'kansas city': 'united states',
  louisville: 'united states',
  miami: 'united states',
  milwaukee: 'united states',
  'new orleans': 'united states',
  newark: 'united states',
  'virginia beach': 'united states',
  wichita: 'united states',
  'old greenwich': 'united states',
  tysons: 'united states',
  mojave: 'united states',
  marietta: 'united states',
  metairie: 'united states',
  frisco: 'united states',
  omaha: 'united states',
  'san antonio': 'united states',
  northlake: 'united states',
  walnut: 'united states',
  'glen cove': 'united states',
  reading: 'united kingdom',
  oxford: 'united kingdom',
  oxfordshire: 'united kingdom',
  wallingford: 'united kingdom',
  longbridge: 'united kingdom',
  ottawa: 'canada',
  aarhus: 'denmark',
  hillerød: 'denmark',
  hillerod: 'denmark',
  greve: 'denmark',
  esbjerg: 'denmark',
  roskilde: 'denmark',
  silkeborg: 'denmark',
  vejle: 'denmark',
  philadelphia: 'united states',
  'salt lake city': 'united states',
  charlotte: 'united states',
  raleigh: 'united states',
  orlando: 'united states',
  oxnard: 'united states',
  plano: 'united states',
  calgary: 'canada',
  'oklahoma city': 'united states',
  'offenbach am main': 'germany',
  oregon: 'united states',
  'quebec city': 'canada',
  'québec city': 'canada',
  melbourne: 'australia',
  casablanca: 'morocco',
  dumaguete: 'philippines',
  tampico: 'mexico',
  lima: 'peru',
  oran: 'algeria',
  tunis: 'tunisia',
  riyadh: 'saudi arabia',
  dublin: 'ireland',
  tallinn: 'estonia',
  sofia: 'bulgaria',
  bulgaria: 'bulgaria',
  colombo: 'sri lanka',
  taipei: 'taiwan',
  lagos: 'nigeria',
  'abu dhabi': 'united arab emirates',
  dubai: 'united arab emirates',
  doha: 'qatar',
  tbilisi: 'georgia',
  'tel aviv': 'israel',
  /** Airport / job-board shorthand. */
  tlv: 'israel',
  'ramat gan': 'israel',
  netanya: 'israel',
  abuja: 'nigeria',
  abidjan: COTE_DIVOIRE,
  dakar: 'senegal',
  douala: 'cameroon',
  bamako: 'mali',
  anaba: 'algeria',
  algiers: 'algeria',
  constantine: 'algeria',
  'dar es salam': 'tanzania',
  'dar es salaam': 'tanzania',
  split: 'croatia',
  almaty: 'kazakhstan',
  cebu: 'philippines',
  pasig: 'philippines',
  'bay area': 'united states',
  'gift city': 'india',
  rochester: 'united states',
  reston: 'united states',
  sterling: 'united states',
  slough: 'united kingdom',
  toulouse: 'france',
  tübingen: 'germany',
  tubingen: 'germany',
  utrecht: 'netherlands',
  valencia: 'spain',
  skopje: 'north macedonia',
  wiesbaden: 'germany',
  wroclaw: 'poland',
  wrocław: 'poland',
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
    .replace(/^[\s,;/|–-]+/g, '')
    .trim();
}

function geoHintWordsInSegment(s: string): boolean {
  const lower = s.toLowerCase();
  if (
    /\b(united states|united kingdom|south korea|north macedonia|new zealand|hong kong)\b/.test(
      lower,
    )
  ) {
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
    const mapped = COUNTRY_ALIASES[w];
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
  if (
    s === 'asia' &&
    /\b(north|south|east|west|central|southeast|southwest|northeast|northwest)\b/.test(
      p,
    )
  ) {
    return true;
  }
  return false;
}

/** True when `s` is only work-arrangement / catch-all hiring words (no city/country tokens). */
function isWorkModeOnlySegment(s: string): boolean {
  let t = s.toLowerCase();
  t = t.replace(/\b(fully\s+)?remote\b/g, '');
  t = t.replace(/\bhybrid\b/g, '');
  t = t.replace(/\b(onsite|on-site)\b/g, '');
  t = t.replace(/\bdistributed\b/g, '');
  t = t.replace(/\bworldwide\b/g, '');
  t = t.replace(/\bglobal\b/g, '');
  t = t.replace(/\binternational\b/g, '');
  t = t.replace(/[^a-z0-9\s]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t.length === 0;
}

/**
 * True when every hyphen-separated segment is a known region/country/city hint
 * (no employer token). Used so suffix-peel does not drop e.g. "North America -
 * South America -" before "Europe".
 */
function isOnlyGeoChain(pk: string): boolean {
  const segs = pk
    .split(/\s*[-–—]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (segs.length < 2) {
    return false;
  }
  for (const seg of segs) {
    if (REGION_ALIASES[seg]) {
      continue;
    }
    if (KNOWN_COUNTRIES.has(seg)) {
      continue;
    }
    if (CITY_COUNTRY_HINTS[seg]) {
      continue;
    }
    const mapped = COUNTRY_ALIASES[seg];
    if (mapped && KNOWN_COUNTRIES.has(mapped)) {
      continue;
    }
    return false;
  }
  return true;
}

function isLikelyEmployerPrefix(prefix: string): boolean {
  const pk = prefix
    .toLowerCase()
    .replace(/[\s,;/|+\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!pk) {
    return false;
  }
  // If connector-stripped text still looks geographic (e.g. "US &"), do not
  // treat this as an employer prefix for suffix peeling.
  const pkWithoutConnectors = pk
    .replace(/\b(and|or)\b/gi, ' ')
    .replace(/[&+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (pkWithoutConnectors && geoHintWordsInSegment(pkWithoutConnectors)) {
    return false;
  }
  const shortCountry = COUNTRY_ALIASES[pk];
  if (shortCountry && KNOWN_COUNTRIES.has(shortCountry)) {
    return false;
  }
  if (isOnlyGeoChain(pk)) {
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
  const firstDelimiter = /\s+[-–—]\s+/.exec(t);
  if (firstDelimiter) {
    let depth = 0;
    for (let i = 0; i < firstDelimiter.index; i += 1) {
      const ch = t[i];
      if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
        depth = Math.max(0, depth - 1);
      }
    }
    // Do not treat parenthesized "city - workmode" fragments as employer split points.
    if (depth > 0) {
      return t;
    }
  }

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
  const leftHasMultiLocationSeparators = /[|;/]/.test(left);
  const leftGeoLike = geoHintWordsInSegment(left);
  const bothSidesGeoLike = leftGeoLike && rightGeo;
  const leftKey = left.toLowerCase().replace(/\s+/g, ' ').trim();
  const leftMapped =
    (COUNTRY_ALIASES[leftKey] as string | undefined) ?? leftKey;
  const leftIsGeoAnchor =
    !!REGION_ALIASES[leftKey] ||
    KNOWN_COUNTRIES.has(leftKey) ||
    KNOWN_COUNTRIES.has(leftMapped) ||
    !!COUNTRY_ALIASES[leftKey] ||
    !!CITY_COUNTRY_HINTS[leftKey];
  if (leftCorp || rightGeo) {
    // Preserve multi-location or geo-rich chains like
    // "Remote U.S. | Remote - Canada" — not an employer-brand prefix.
    if (leftHasMultiLocationSeparators || bothSidesGeoLike) {
      return t;
    }
    if (leftIsGeoAnchor && isWorkModeOnlySegment(right)) {
      return t;
    }
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
  return (
    value
      .normalize('NFC')
      .toLowerCase()
      .replace(/^\*?\s*hq\b\s*(?:[-–—:,]+\s*)?/g, '')
      .replace(/\banywhere\s+in\b/g, '')
      .replace(/\bhq\b/g, '')
      .replace(/\b(headquarters|head\s+office)\b/g, '')
      .replace(/^\s*labs\s*$/gi, '')
      .replace(/\s+labs\s*$/gi, '')
      .replace(/\bin\s*[- ]?\s*office\b/g, '')
      .replace(/\boffice\b/g, '')
      .replace(/\b(hybrid|onsite)\b/g, '')
      .replace(/\bm\s*,\s*w\s*,\s*f\b/gi, '')
      .replace(/\bm\s+w\s+f\b/gi, '')
      .replace(/\bremote\b\s*[-,:]?\s*/g, '')
      .replace(/\banywhere\b\s*[-,:]?\s*/g, '')
      /** ATS boilerplate e.g. `Canada: Select locations`, `US: Select locations`. */
      .replace(/:\s*select\s+locations\b/gi, '')
      /** Same pattern with “All locations” (e.g. `US: All locations`). */
      .replace(/:\s*all\s+locations\b/gi, '')
      .replace(/[.;]/g, ' ')
      .replace(/\bselect\s+locations\b/gi, '')
      .replace(/\ball\s+locations\b/gi, '')
      .replace(/\bany\s+location\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s-–—]+|[\s-–—]+$/g, '')
      .replace(/\s+\bin\s*$/g, '')
      .trim()
  );
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
  const preStripped = raw
    /** `Fully Remote, France` — strip prefix so comma survives token normalization. */
    .replace(/\bfully\s+remote\s*,\s*/gi, '')
    /**
     * `Germany-Remote, Netherlands` — hyphen glues remote to country; unwrap before comma split.
     */
    .replace(/\b([a-z]{2,})-remote(\s*,\s*)/gi, '$1$2')
    /** Corporate US zone tag. */
    .replace(/\beast\s*,\s*us\s+region\b/gi, 'United States')
    /** GTA — normalize before hyphen employer heuristic drops the city half. */
    .replace(
      /\bgreater\s+toronto\s+area(?:\s*[-–—]\s*remote)?\b/gi,
      'Toronto, Canada',
    )
    /** Common Canadian metro pair — split so city hints resolve (avoid naive `&` split; breaks `Bosnia & Herzegovina`). */
    .replace(/\bmontreal\s*&\s*toronto\b/gi, 'Montreal | Toronto')
    .replace(/\btoronto\s*&\s*montreal\b/gi, 'Toronto | Montreal')
    /** Hangzhou spelling variants (ATS / romanization noise). */
    .replace(/\bhang\s+zhou\b/gi, 'Hangzhou')
    .replace(/\bhangzhou\b/gi, 'Hangzhou')
    /** ATS spelling mistakes (`United State`, `Unites States`). */
    .replace(/\bunites\s+states\b/gi, 'United States')
    .replace(/\bunited\s+state\b/gi, 'United States')
    /** `EMEA- EU` → spaced hyphen so hyphen-split sees separate facets. */
    .replace(/([A-Za-z]{2,})-\s+/g, '$1 - ')
    /** GIFT City (Gujarat, India) — comma-separate so APAC and India both resolve. */
    .replace(/\s*\(\s*gift\s+city\s*\)/gi, ', gift city')
    /** Timezone qualifiers in parentheses, not geography. */
    .replace(/\([^)]*\bhours\b[^)]*\)/gi, '')
    .replace(/\bglobal\s*,\s*remote\b/gi, 'Worldwide')
    .replace(/\bglobal\s+remote\b/gi, 'Worldwide')
    .replace(/\bindia[-–—]bangalore\b/gi, 'Bangalore, India')
    .replace(/\bindia\s+bangalore\b/gi, 'Bangalore, India')
    .replace(/\bquébec\s+city\s*,\s*québec\b/gi, 'Quebec City, QC, Canada')
    .replace(/\bquebec\s+city\s*,\s*quebec\b/gi, 'Quebec City, QC, Canada')
    .replace(/^\s*all locations\s*$/gi, '')
    .replace(/^\s*no location\s*$/gi, '')
    .replace(
      /\bedt\s*\/\s*est\s*\([^)]*us\s+east\s+coast[^)]*\)/gi,
      'United States',
    )
    .replace(
      /\bremote\s+first\s*[-–—]\s*western\s+european\s*\+\s*eastern\s+time\s+zones\b/gi,
      'Europe, United States',
    )
    /** Timezone-only region qualifiers should not become geo tokens. */
    .replace(/\bcet\s*\/\s*cest\b/gi, '')
    .replace(/\bcet\b/gi, '')
    .replace(/\bcest\b/gi, '')
    .replace(/\butc\b/gi, '')
    /** Greenhouse / ATS sandbox rows — not a place. */
    .replace(/\bz-test\s*&\s*templates\s*only\b/gi, '')
    .replace(/\blatin\s+america\s*[-–—]\s*remote\b/gi, 'Latin America')
    .replace(
      /\banywhere\s+in\s+europe\s+and\s+south\s+america\b/gi,
      'Europe | South America',
    )
    .replace(/\beurope\s+and\s+south\s+america\b/gi, 'Europe | South America')
    /** Spanish “remote”. */
    .replace(/\bremoto\b/gi, 'Remote')
    .replace(/\brepublic\s+of\s+ireland\s*\(\s*remote\s*\)/gi, 'Ireland')
    /** Portuguese “Hybrid,” prefix before city. */
    .replace(/\bhíbrido\s*,\s*/gi, '')
    .replace(/\bhibrido\s*,\s*/gi, '')
    /** ISO country suffix (e.g. Greenhouse). */
    .replace(/\bzürich\s*,\s*ch\b/gi, 'Zürich, Switzerland')
    .replace(/\bzurich\s*,\s*ch\b/gi, 'Zürich, Switzerland')
    /** Remote zone shorthand → geography tokens. */
    .replace(/\bremote\s+us\s+east\b/gi, 'East Coast, United States')
    .replace(/\bremote\s+position\b/gi, 'Remote')
    .replace(/\bvirtual\s+us\b/gi, 'United States')
    .replace(/\bjohannesburg\s+warehouse\b/gi, 'Johannesburg')
    .replace(/\bremote-+united-+states\b/gi, 'United States')
    .replace(/\bremote-+united-+kingdom\b/gi, 'United Kingdom')
    .replace(/\bremote\s*-\s*aus\b/gi, 'Australia')
    .replace(/\bremote\s*-\s*north\s+tx\b/gi, 'Texas, United States')
    .replace(
      /\bremote\s*-\s*va\s*&\s*ky\b/gi,
      'Virginia, United States; Kentucky, United States',
    )
    .replace(
      /\bsouthern\s+california\s*-\s*remote\b/gi,
      'California, United States',
    )
    .replace(
      /\bunited\s+states\s*-\s*remote\s*\|\s*st\.\s*louis\s*-\s*hybrid\b/gi,
      'United States; St. Louis, Missouri',
    )
    .replace(/\bhouston\s*-\s*hybrid\b/gi, 'Houston, TX')
    .replace(
      /\bremote\s*\|\s*must\s+be\s+located\s+and\s+willing\s+to\s+travel\s+in\s+the\s+middle\s+east\b/gi,
      'Middle East',
    )
    .replace(
      /\bremote\s*,\s*springfield\s+il\s*,\s*plano\s+tx\b/gi,
      'Springfield, IL; Plano, TX',
    )
    .replace(/\bremote-central\s+america\b/gi, 'Latin America')
    .replace(
      /\bremote\/hybrid\s*\(\s*socal\s*\)/gi,
      'California, United States',
    )
    .replace(/\bremote\s*:\s*boston\s+area\b/gi, 'Boston, MA')
    .replace(/\bremote\s*:\s*northeast\s+us\b/gi, 'East Coast, United States')
    .replace(/\breston\/dulles\s+virginia\b/gi, 'Reston, VA')
    .replace(
      /\bsf\s+bay\s+area\s*\/\s*remote\b/gi,
      'San Francisco Bay Area, California',
    )
    .replace(
      /\bsf\s+bay\s+area\s+or\s+nyc\s+preferred\s*,\s*or\s+remote\b/gi,
      'San Francisco, CA; New York, NY',
    )
    .replace(
      /\bsan\s+francisco\s+and\/or\s+us\s+remote\b/gi,
      'San Francisco, CA, United States',
    )
    .replace(/\bwest\s*,\s*us\s+region\b/gi, 'West Coast, United States')
    .replace(/\bst\.\s*francis\s+wi\b/gi, 'St. Francis, WI')
    .replace(/\bsoutheastern\s+us\b/gi, 'Southeast US, United States')
    .replace(
      /\bwoburn\s+ma\s*&\s*arlington\s+va\b/gi,
      'Woburn, MA; Arlington, VA',
    )
    .replace(
      /\bwork\s+from\s+home\s*[-–]\s*eastern\s+us\b/gi,
      'East Coast, United States',
    )
    .replace(/\bwroclaw\s*,\s*remote\b/gi, 'Wroclaw, Poland')
    .replace(/\bwrocław\s*,\s*remote\b/gi, 'Wroclaw, Poland')
    /** Louisiana census place used as ATS site label. */
    .replace(/\bverda\s+park\b/gi, 'Louisiana, United States')
    /** Corporate Latin America tag (`LatAm`). */
    .replace(/\blatam\b/gi, 'Latin America')
    /** Corporate North America shorthand. */
    .replace(/\bnamer\b/gi, 'North America')
    .replace(/\bremote-uk&i\b/gi, 'United Kingdom, Ireland')
    .replace(/\bremote-iberia\b/gi, 'Iberia')
    .replace(/\bremote-noram\b/gi, 'North America')
    .replace(/\bremote-nordics\b/gi, 'Nordics')
    .replace(/\bremote-dach\b/gi, 'Germany, Austria, Switzerland')
    .replace(/\bremote\s*-\s*ind\b/gi, 'India')
    .replace(/\bremote\s*-\s*u\.s\.a\.?\b/gi, 'United States')
    .replace(/\bremote\s+us\s+central\b/gi, 'Central US, United States')
    .replace(/\bremote\s*-\s*ga\b/gi, 'Georgia, United States')
    /** Drop timezone blurbs after “Remote |” (`UTC-6 to UTC+2`, etc.). */
    .replace(/\bremote\s*\|\s*utc\b[^,;|]*/gi, 'Remote')
    .replace(
      /\bremote\s*\|\s*utc[\s\-+\d.]*(?:\s+to\s+utc[\s\-+\d.]*)?/gi,
      'Remote',
    )
    /** ATS noise — not a geography (whole string only). */
    .replace(/^\s*field\s*$/gi, '')
    .replace(/^\s*permanent\s*$/gi, '')
    /** City + “Office” before comma clutter. */
    .replace(/\bthiruvananthapuram\s+office\b/gi, 'Thiruvananthapuram')
    /** China / Canada / UK ATS spacing. */
    .replace(/\bshang\s+hai\b/gi, 'Shanghai')
    .replace(/\btoronto\s+canada\b/gi, 'Toronto, Canada')
    .replace(/\bwallingford\s+uk\b/gi, 'Wallingford, United Kingdom')
    /** US state postal `IN` / `OR` — spell out (not India / English “or”). */
    .replace(/\bindianapolis\s*,\s*in\b/gi, 'Indianapolis, Indiana')
    .replace(/\bremote\s*-\s*in\b/gi, 'Indiana, United States')
    .replace(/\bremote\s*-\s*or\b/gi, 'Oregon, United States')
    .replace(/\bremote\s*-\s*washington\s+d\.c\./gi, 'Washington, DC')
    .replace(/\bremote\s*-\s*washington\s+dc\b/gi, 'Washington, DC')
    .replace(/\bremote\s*-\s*boston\s+metro\b/gi, 'Boston, MA')
    .replace(/\bremote\s*-\s*calgary\b/gi, 'Calgary, Canada')
    .replace(
      /\bremote\s*-\s*eastern\s+or\s+central\s+time\s+zone\b/gi,
      'United States',
    )
    .replace(/\bremote\s*-\s*new\s+england\b/gi, 'East Coast, United States')
    .replace(/\bremote\s*\(\s*northeast\s*\)/gi, 'East Coast, United States')
    .replace(/\bremote\s*\(\s*southeast\s*\)/gi, 'Southeast US, United States')
    .replace(
      /\bremote\s*\(\s*mountain\s+west\s*\)/gi,
      'Mountain West, United States',
    )
    .replace(/\bphl\s+remote\b/gi, 'Philadelphia, PA')
    .replace(/\boregon\s*[-–]\s*remote\b/gi, 'Oregon, United States')
    .replace(/\bind\s+remote\b/gi, 'India')
    /** Regional remote macros. */
    .replace(/\bremote-northeast\s+asia\b/gi, 'Northeast Asia')
    .replace(/\bremote\s+us\s+west\b/gi, 'West Coast, United States')
    .replace(/\bremote\s+roles\s*-\s*cis\b/gi, 'CIS')
    /** Israel ATS hyphen blob (`Israel-Tel-Aviv Yafo Office`). Escaped `-` avoids regexp ambiguity. */
    .replace(
      /israel\s*-\s*tel\s*-\s*aviv\s+yafo\s+office/gi,
      'Tel Aviv, Israel',
    )
    /** Portugal / EN hybrid + glued city. */
    .replace(/\bhybrid\s*,\s*sanfrancisco\b/gi, 'San Francisco, California')
    .replace(/\bsingapore\s+city\b/gi, 'Singapore')
    /** Finland hybrid + on-site duplicate (ATS lists both modes). */
    .replace(
      /\bhybrid\s*-\s*oulu\s*,\s*north\s+ostrobothnia\s*,\s*on-site\s*-\s*oulu\s*,\s*north\s+ostrobothnia\b/gi,
      'Oulu, Finland',
    )
    .replace(
      /\b(?:hybrid|on-site)\s*-\s*oulu\s*,\s*north\s+ostrobothnia\b/gi,
      'Oulu, Finland',
    )
    /** Common US city + remote hub phrases (ATS). */
    .replace(/\bnew\s+york\s+ny\b/gi, 'New York, NY')
    .replace(/\baustin\s+tx\b/gi, 'Austin, TX')
    .replace(/\bportland\s*,\s*or\b/gi, 'Portland, Oregon')
    .replace(/\bportland\s+or\b/gi, 'Portland, Oregon')
    .replace(/\bglen\s+cove\s*,\s*ny\b/gi, 'Glen Cove, NY')
    .replace(/\bpasig\s*,\s*phl\b/gi, 'Pasig, Philippines')
    .replace(/\bremote\s*-\s*washington\s*,\s*d\.c\./gi, 'Washington, DC')
    .replace(/\bremote\s*-\s*jacksonville\b/gi, 'Jacksonville, FL')
    .replace(/\bremote\s*-\s*kansas\s+city\b/gi, 'Kansas City, MO')
    .replace(/\bremote\s*-\s*louisville\b/gi, 'Louisville, KY')
    .replace(/\bremote\s*-\s*miami\b/gi, 'Miami, FL')
    .replace(/\bremote\s*-\s*milwaukee\b/gi, 'Milwaukee, WI')
    .replace(/\bremote\s*-\s*new\s+orleans\b/gi, 'New Orleans, LA')
    .replace(/\bremote\s*-\s*newark\b/gi, 'Newark, NJ')
    .replace(/\bremote\s*-\s*oklahoma\s+city\b/gi, 'Oklahoma City, OK')
    .replace(
      /\bnational\s+capital\s+region\b/gi,
      'Washington, DC, United States',
    )
    .replace(/\bnortheastern\s+us\b/gi, 'East Coast, United States')
    .replace(/\bohio\s+valley\s*,\s*us\s+region\b/gi, 'United States')
    .replace(/\braleigh\s*[-–]\s*durham\b/gi, 'Raleigh, NC')
    .replace(/\boxnard\s+ca\b/gi, 'Oxnard, CA')
    .replace(/\bplano\s*\.\s*tx\b/gi, 'Plano, TX')
    .replace(/\bremote\s*-\s*vancouver\b/gi, 'Vancouver, Canada')
    .replace(/\bremote\s*-\s*virginia\s+beach\b/gi, 'Virginia Beach, VA')
    .replace(/\bremote\s*-\s*wichita\b/gi, 'Wichita, KS')
    /** After specific cities — “Remote - OK” = Oklahoma (state), not “OK” word sense. */
    .replace(/\bremote\s*-\s*ok\b/gi, 'Oklahoma, United States')
    .replace(/\bremote\s+anywhere\s+in\s+the\s+world\b/gi, 'Worldwide')
    .replace(/\bremote\s*-\s*anywhere\b/gi, 'Worldwide')
    .replace(
      /\bremote\s*:\s*west\s+coast\s+us\b/gi,
      'West Coast, United States',
    )
    .replace(/\busa\s*[-–—]\s*remote\b/gi, 'United States')
    /** GCC / US shorthand. */
    .replace(/\buae\s+abu\s+dhabi\b/gi, 'Abu Dhabi, United Arab Emirates')
    .replace(/\bukd\s+remote\b/gi, 'United Kingdom')
    .replace(/\busca\b/gi, 'United States, California')
    .replace(/\bwest\s+us\s+region\b/gi, 'West Coast, United States')
    /** South Africa province label. */
    .replace(/\bkwazulu\s+natal\b/gi, 'South Africa')
    /** China remote qualifiers. */
    .replace(/\bmainland\s+china\s*\(\s*remote\s*\)/gi, 'China')
    .replace(
      /\blubumbashi\s*,\s*democratic\s+republic\s+of\s+the\s+congo\b/gi,
      'Lubumbashi, Congo - Kinshasa',
    )
    /** Hybrid + glued “SanFrancisco” ATS text. */
    .replace(
      /\bhybrid\s+sanfrancisco\s*,\s*or\s+remote\b[^|]*/gi,
      'San Francisco, California',
    )
    /** US “City ST” without comma (ATS). */
    .replace(/\bkansas\s+city\s+mo\b/gi, 'Kansas City, MO')
    .replace(/\blouisville\s+ky\b/gi, 'Louisville, KY')
    .replace(/\blehi\s+ut\b/gi, 'Lehi, UT')
    /** UK postcode line → city + country. */
    .replace(
      /\blongbridge\s*,\s*b\d{1,2}\s*\d[a-z]{2}\b/gi,
      'Longbridge, United Kingdom',
    )
    /** Multi-site “ST-City” corporate templates (split on `. ST-`). */
    .replace(/\bNY-New\s+York\b/gi, 'New York, NY')
    .replace(/\bSF-San\s+Francisco\b/gi, 'San Francisco, CA')
    /** `. TX-` → `; TX-` so comma-split does not glue `CA` to `Frisco`. */
    .replace(/\.\s*(?=[A-Z]{2}-)/g, '; ')
    .replace(/\bTX-Frisco\b/gi, 'Frisco, TX')
    .replace(/\bFL-Jacksonville\b/gi, 'Jacksonville, FL')
    .replace(/\bDE-Greenville\b/gi, 'Greenville, DE')
    .replace(/\bUT-Cottonwood\s+Heights\b/gi, 'Cottonwood Heights, UT')
    .replace(/\bNC-Charlotte\b/gi, 'Charlotte, NC')
    .replace(/\bnorth\s+carolina\s*[-–]\s*charlotte\b/gi, 'Charlotte, NC')
    /** Sandbox / template tokens. */
    .replace(/\*?\s*job\s+posting\s+only\s*:\s*usa\d*\b/gi, 'United States')
    /** ATS placeholder strings — whole-line only (no geography). */
    .replace(/^\s*talent\s+pool\s*$/gi, '')
    .replace(/^\s*all\s+hubs\s*$/gi, '')
    .replace(/^\s*any\s+location\s*$/gi, '')
    .replace(/^\s*add\s+all\s+locations\s+here\s*$/gi, '')
    .replace(/^\s*btc\s*$/gi, '')
    .replace(/^\s*hq\s*$/gi, '')
    .replace(/^\s*labs\s*$/gi, '')
    .replace(/^\s*passive\s+posting\s*$/gi, '')
    .replace(/^\s*other\s+locations\s*$/gi, '')
    .replace(/^\s*on-site\s+at\s+project\s+location\s*$/gi, '')
    .replace(/^\s*various\s+locations\s*$/gi, '')
    /** Whole-line remote-ish macros → worldwide region for facets. */
    .replace(/^\s*fully\s+remote\s*$/gi, 'Worldwide')
    /** SpaceX-style multi-site listing — approximate US-wide for geography facets. */
    .replace(/\bflexible\s*-\s*any\s+site\b/gi, 'United States');
  return (
    stripEmployerBrandFromLocation(preStripped)
      /** Cape Town / Durban datacenter site codes — not US District of Columbia. */
      .replace(/\bcape\s+town\s+dc\d*\b/gi, 'Cape Town')
      .replace(/\bdurban\s+dc\d*\b/gi, 'Durban')
      .replace(/\bjohannesburg\s+dc\d*\b/gi, 'Johannesburg')
      .replace(/\bfort\s+worth\s+tx\b/gi, 'Fort Worth, TX')
      .replace(/\bfrankfurt\s+am\s+main\b/gi, 'Frankfurt')
      .replace(/\bft\.?\s*meade\b/gi, 'Fort Meade, MD')
      .replace(/\bcentral\s*\/\s*western\s+us\b/gi, 'United States')
      .replace(/\bcentral\s+us\b/gi, 'Central US, United States')
      /** OR omitted from postal map (English “or”); spell out Oregon for facets. */
      .replace(/\bhillsboro\s*,\s*or\b/gi, 'Hillsboro, Oregon')
      .replace(/\bhillsboro\s+or\b/gi, 'Hillsboro, Oregon')
      .replace(/\bhanover\s*,\s*md\b/gi, 'Hanover, MD')
      .replace(/\bhanover\s+md\b/gi, 'Hanover, MD')
      .replace(/\bchantilly\s+va\b/gi, 'Chantilly, VA')
      .replace(/\bconcord\s+ca\b/gi, 'Concord, CA')
      .replace(/\bdetroit\s+mi\b/gi, 'Detroit, MI')
      .replace(/\bclark\s+phl\b/gi, 'Clark, Philippines')
      .replace(/\bcanada\s*&\s*usa\b/gi, 'Canada, United States')
      .replace(/\busa\s*&\s*canada\b/gi, 'United States, Canada')
      .replace(/\bcanada\s*&\s*us\b/gi, 'Canada, United States')
      .replace(/\bus\s*&\s*canada\b/gi, 'United States, Canada')
      /** Full names + optional `(Remote)` — pipe-split so both countries resolve (see tests). */
      .replace(
        /\bunited\s+states\s*&\s*canada(?:\s*\(\s*remote\s*\))?/gi,
        'United States | Canada',
      )
      .replace(
        /\bcanada\s*&\s*united\s+states(?:\s*\(\s*remote\s*\))?/gi,
        'Canada | United States',
      )
      .replace(/\bunited\s+states\s*&\s*emea\b/gi, 'United States, EMEA')
      .replace(/\bemea\s*&\s*united\s+states\b/gi, 'EMEA, United States')
      .replace(
        /\bbelgium\s*[-–—]\s*brussels?\s+office\b/gi,
        'Brussels, Belgium',
      )
      .replace(/\bcdmx\d+\b/gi, 'Mexico City, Mexico')
      .replace(/,\s*([a-z]{2})\s+united\s+states\b/gi, ', $1, United States')
      .replace(/\bdistributed\s*\(\s*([^)]+)\s*\)/gi, (_m, inner: string) =>
        inner.trim(),
      )
      .replace(/\bphillipines\b/gi, 'Philippines')
      .replace(/\bae\s*[-–—]\s*dubai\b/gi, 'Dubai')
      .replace(/\bca\s*[-–—]\s*toronto\b/gi, 'Toronto, Canada')
      .replace(/\bil\s*[-–—]\s*tel\s+aviv\b/gi, 'Tel Aviv, Israel')
      .replace(/\bsg\s*[-–—]\s*singapore\b/gi, 'Singapore')
      .replace(/\bhk\s*[-–—]\s*hong\s+kong(?:\s+SAR)?\b/gi, 'Hong Kong')
      .replace(/\bhong\s+kong\s+SAR\b/gi, 'Hong Kong')
      .replace(/\bvietnam2\b/gi, 'Vietnam')
      .replace(/\buk\s*[-–—]\s*london\b/gi, 'London, United Kingdom')
      .replace(
        /\bus\s*[-–—]\s*san\s+francisco\b/gi,
        'San Francisco, California',
      )
      .replace(/\bus\s*[-–—]\s*san\s+jose\b/gi, 'San Jose, California')
      .replace(/\bindia\s*[-–—]\s*pune\b/gi, 'Pune, India')
      .replace(/\blimassol\s+cyprus\b/gi, 'Limassol, Cyprus')
      .replace(/\btechnological\s+pole\s+almada\b/gi, 'Lisbon, Portugal')
      .replace(/\bsan\s+francisco\s+bay\s+area\b/gi, 'Bay Area')
      .replace(/\bcongo\s*,?\s*brazzaville\b/gi, 'Congo - Brazzaville')
      .replace(/\bnew\s+york\s+city\s+area\b/gi, 'New York')
      .replace(/\bpittsburgh\s+area\b/gi, 'Pittsburgh')
      .replace(/\bmiami\s+area\b/gi, 'Miami')
      .replace(/\bamsterdam\s+l\s+remote\b/gi, 'Amsterdam')
      .replace(/\bnew\s+york\s+city\b/gi, 'New York')
      .replace(/\bseattle\s+metro\b/gi, 'Seattle')
      .replace(/,\s*ca\s+united\s+states\b/gi, ', CA, United States')
      .replace(/\bhq\s*:\s*/gi, '')
      .replace(/\bremote\s+u\.s\.?\b/gi, 'United States')
      .replace(/\bremote\s*,\s*usa\b/gi, 'United States')
      .replace(/\bnew\s+york\s+city\s+office\b/gi, 'New York')
      .replace(/\busa\s+-\s*remote\b/gi, 'United States')
      .replace(/\bunited\s+states\s*[-–—]\s*remote\b/gi, 'United States')
      .replace(/\bindia\s*[-–—]\s*bangalore\b/gi, 'Bangalore, India')
      .replace(/\bindia\s*[-–—]\s*remote\b/gi, 'India')
      .replace(/\btoronto\s*[-–—]\s*remote\b/gi, 'Toronto, Canada')
      .replace(/\bau\s*[-–—]\s*melbourne\b/gi, 'Melbourne, Australia')
      .replace(/\bengland\s*[-–—]\s*london\b/gi, 'London, United Kingdom')
      .replace(/\bremote\s*\(\s*world\s*\)/gi, 'Worldwide')
      .replace(/\bremote\s+international\b/gi, 'Worldwide')
      .replace(/\bremote\s*[-–—]\s*international\b/gi, 'Worldwide')
      .replace(/\bremote\s+hq\b/gi, 'Remote')
      .replace(/\ball\s+offices\b/gi, '')
      .replace(/\s*\(\s*hq\s*\)/gi, '')
      .replace(/\bnyc\s*\([^)]*\)\s*hybrid\b/gi, 'New York')
      .replace(/\bnew\s+york\s+office\s*\([^)]*\)/gi, 'New York')
      .replace(
        /\bsan\s+francisco\s*\(\s*on-?site\s*\)/gi,
        'San Francisco, California',
      )
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
      .replace(/\bus\s*[-–—]\s*based\b/gi, 'United States')
      .replace(/\bus\s+full[-\s]?time\b/gi, 'United States')
      .replace(/\bindia\s+team\b/gi, 'India')
      .replace(/\bwashington\s+d\.c\.?\b/gi, 'Washington, DC')
      .replace(/\bwashington\s+dc\b/gi, 'Washington, DC')
      .replace(/\breading\s*\(\s*london\s*\)/gi, 'Reading, United Kingdom')
      .replace(/\b([a-z0-9]+)\s*\(\s*can\s*\)/gi, '$1, Canada')
      .replace(/\bnorthlake\s+il\b/gi, 'Northlake, IL')
      .replace(/\bwalnut\s+ca\b/gi, 'Walnut, CA')
      .replace(/\bsan\s+antonio\s+tx\b/gi, 'San Antonio, TX')
      .replace(
        /\bwallingford\s*,\s*oxfordshire\b/gi,
        'Wallingford, United Kingdom',
      )
      .replace(/\bsan\s+francisco-hq\b/gi, 'San Francisco')
      .replace(/\bpalo\s+alto\s+office\b/gi, 'Palo Alto')
      .replace(/\bnew\s+york-office\s*\([^)]*\)/gi, 'New York')
      /** Foster City + ATS hybrid / schedule noise (specific before generic `[^,|]*`). */
      .replace(
        /\bfoster\s+city\s*,\s*ca\s*\(\s*hybrid\s*\)\s*in[- ]office\s*m\s*,\s*w\s*,\s*f\b/gi,
        'Foster City, CA',
      )
      .replace(
        /\bfoster\s+city\s*,\s*ca\s*\([^)]*\)[^,|]*/gi,
        'Foster City, CA',
      )
      /** Omaha campus-style suffix (Nebraska). */
      .replace(/\bomaha\s+riverfront\b/gi, 'Omaha, NE')
      .replace(/\bmoonachie\s+nj\b/gi, 'Moonachie, NJ')
      /** PA office + legal boilerplate. */
      .replace(
        /\bwest\s+chester\s*,\s*pa\b\s+and\s+unanticipated\s+worksites/gi,
        'West Chester, PA',
      )
  );
}

/** Split `Europe and South America` when every ` and `-joined part is a known region/country/city. */
function splitGeoAndConjunction(segment: string): string[] {
  const t = segment.trim();
  if (!/\s+and\s+/i.test(t)) {
    return [segment];
  }
  const parts = t
    .split(/\s+and\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length < 2) {
    return [segment];
  }
  const isGeoPart = (part: string): boolean => {
    const key = normalizeToken(part);
    if (!key) {
      return false;
    }
    if (REGION_ALIASES[key]) {
      return true;
    }
    const country = COUNTRY_ALIASES[key] ?? key;
    if (KNOWN_COUNTRIES.has(country)) {
      return true;
    }
    if (CITY_COUNTRY_HINTS[key]) {
      return true;
    }
    return false;
  };
  if (parts.every(isGeoPart)) {
    return parts;
  }
  return [segment];
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
      const plusParts = hyphenPart
        .split(/\s*\+\s*/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      for (const plusPart of plusParts) {
        const multiSpaceParts = plusPart
          .split(/\s{2,}/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0);
        const subParts =
          multiSpaceParts.length > 0 ? multiSpaceParts : [plusPart];
        for (const subPart of subParts) {
          const orParts = subPart
            .split(/\s+or\s+/i)
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
          for (const orPart of orParts) {
            segments.push(...splitGeoAndConjunction(orPart));
          }
        }
      }
    }
  }

  return segments;
}

/** Same facet key resolution as {@link extractLocationFacets} inner loop (metro → postal → province → raw). */
function facetKeyFromSegmentToken(trimmedBit: string): string {
  return (
    US_METRO_ABBREV_TO_TOKEN[trimmedBit] ??
    US_STATE_POSTAL_TO_TOKEN[trimmedBit] ??
    CANADA_PROVINCE_POSTAL_TO_TOKEN[trimmedBit] ??
    trimmedBit
  );
}

/** True when this comma segment resolves to `united states` (explicit name or alias like `usa`). */
function mapsToUnitedStates(trimmedBit: string): boolean {
  const fk = facetKeyFromSegmentToken(trimmedBit);
  if (fk === 'united states') {
    return true;
  }
  const alias =
    (COUNTRY_ALIASES[trimmedBit] as string | undefined) ?? COUNTRY_ALIASES[fk];
  return alias === 'united states';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `Denver CO` → city + US postal so both Colorado and United States resolve. */
function splitTrailingUsStatePostal(segment: string): string[] {
  const t = segment.trim().toLowerCase().replace(/\s+/g, ' ');
  const m = t.match(/^(.+?)\s+([a-z]{2})$/);
  if (!m) {
    return [segment];
  }
  const st = m[2];
  if (!Object.prototype.hasOwnProperty.call(US_STATE_POSTAL_TO_TOKEN, st)) {
    return [segment];
  }
  return [m[1].trim(), st];
}

/** `Shreveport Louisiana` → city + US state name token. */
function splitTrailingUsStateFullName(segment: string): string[] {
  const t = segment.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const stateName of US_STATE_FULL_NAMES_SORTED) {
    if (t === stateName) {
      return [segment];
    }
    if (!t.endsWith(stateName)) {
      continue;
    }
    const remainder = t.slice(0, t.length - stateName.length);
    if (!remainder.endsWith(' ')) {
      continue;
    }
    const cityPart = remainder.trimEnd();
    if (cityPart.length === 0) {
      continue;
    }
    return [cityPart, stateName];
  }
  return [segment];
}

/** `London UK` / `Geneva CH` → city + ISO-2 alias (not US/CA postal collisions). */
function splitTrailingIsoCountrySuffix(segment: string): string[] {
  const t = segment.trim().toLowerCase().replace(/\s+/g, ' ');
  const m = t.match(/^(.+?)\s+([a-z]{2})$/);
  if (!m) {
    return [segment];
  }
  const suf = m[2];
  if (!ISO2_COUNTRY_SUFFIX_KEYS.has(suf)) {
    return [segment];
  }
  return [m[1].trim(), suf];
}

/** `Mumbai India` → city + trailing known country phrase. */
function splitTrailingKnownCountryWord(segment: string): string[] {
  const t = segment.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const country of KNOWN_COUNTRY_PHRASES_SORTED) {
    const re = new RegExp(`^(.+?)\\s+${escapeRegExp(country)}$`, 'i');
    const m = t.match(re);
    if (!m || m[1].trim().length === 0) {
      continue;
    }
    const left = m[1].trim();
    if (
      country === 'australia' &&
      !left.includes(' ') &&
      AUSTRALIAN_STATE_LEADING_TOKEN_BLOCKLIST.has(left)
    ) {
      continue;
    }
    return [left, country];
  }
  return [segment];
}

function expandCommaSegmentToFacetTokens(rawBit: string): string[] {
  const trimmed = rawBit.trim();
  if (!trimmed) {
    return [];
  }
  let parts = [trimmed];
  parts = parts.flatMap((p) => splitTrailingUsStatePostal(p));
  parts = parts.flatMap((p) => splitTrailingUsStateFullName(p));
  parts = parts.flatMap((p) => splitTrailingIsoCountrySuffix(p));
  parts = parts.flatMap((p) => splitTrailingKnownCountryWord(p));
  return parts.filter((p) => p.length > 0);
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

    const bitsSource =
      commaBits.length > 0
        ? commaBits.flatMap((bit) => expandCommaSegmentToFacetTokens(bit))
        : expandCommaSegmentToFacetTokens(normalizedPart);
    const trimmedBits = bitsSource
      .map((bit) =>
        stripLeadingInSegment(bit.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim()),
      )
      .filter((b): b is string => b.length > 0);

    const hasUnitedStatesSibling = trimmedBits.some(mapsToUnitedStates);

    const hasUnitedStatesCityHintSibling = trimmedBits.some((b) => {
      const fk = facetKeyFromSegmentToken(b);
      return CITY_COUNTRY_HINTS[fk] === 'united states';
    });

    /** `DE` doubles as US Delaware and ISO Germany; prefer Germany when a German city hint is in the same segment. */
    const impliesGermanyFromCityHint = trimmedBits.some((b) => {
      const fk = facetKeyFromSegmentToken(b);
      return CITY_COUNTRY_HINTS[fk] === 'germany';
    });

    /** `NL` doubles as Canada Newfoundland & Labrador and ISO Netherlands; prefer NL when a Dutch city hint is present. */
    const impliesNetherlandsFromCityHint = trimmedBits.some((b) => {
      const fk = facetKeyFromSegmentToken(b);
      return CITY_COUNTRY_HINTS[fk] === 'netherlands';
    });

    for (const bit of bitsSource) {
      const trimmedBit = stripLeadingInSegment(
        bit.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim(),
      );
      if (!trimmedBit) {
        continue;
      }
      let fromUsStatePostal = trimmedBit in US_STATE_POSTAL_TO_TOKEN;

      let fromCanadaProvincePostal =
        trimmedBit in CANADA_PROVINCE_POSTAL_TO_TOKEN;

      let facetKey = facetKeyFromSegmentToken(trimmedBit);
      if (trimmedBit === 'de' && impliesGermanyFromCityHint) {
        fromUsStatePostal = false;
        facetKey = 'germany';
      }
      if (trimmedBit === 'nl' && impliesNetherlandsFromCityHint) {
        fromCanadaProvincePostal = false;
        facetKey = 'netherlands';
      }
      const mappedCountry = COUNTRY_ALIASES[facetKey] ?? facetKey;
      const mappedRegion = REGION_ALIASES[facetKey];
      // Keep canonical country tokens (e.g. "czech republic" -> "czechia").
      if (mappedRegion) {
        tokens.add(mappedRegion);
      } else {
        tokens.add(
          KNOWN_COUNTRIES.has(mappedCountry) ? mappedCountry : facetKey,
        );
      }

      /** `Georgia` is US state and country; US city hint or explicit US in segment picks the state. */
      const georgiaAsUsState =
        facetKey === 'georgia' &&
        US_STATE_NAME_SET.has('georgia') &&
        (hasUnitedStatesSibling || hasUnitedStatesCityHintSibling);

      if (
        US_STATE_NAME_SET.has(facetKey) &&
        (!KNOWN_COUNTRIES.has(facetKey) || georgiaAsUsState)
      ) {
        countries.add('united states');
        tokens.add('united states');
      }
      if (
        CANADA_PROVINCE_NAME_SET.has(facetKey) &&
        !(trimmedBit === 'nl' && impliesNetherlandsFromCityHint)
      ) {
        countries.add('canada');
        tokens.add('canada');
      }

      if (mappedRegion) {
        regions.add(mappedRegion);
      }

      if (
        !fromUsStatePostal &&
        !fromCanadaProvincePostal &&
        KNOWN_COUNTRIES.has(mappedCountry) &&
        !(georgiaAsUsState && mappedCountry === 'georgia')
      ) {
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

/** `{geo} remote` / `remote - {geo}` in titles or location text (e.g. `US Remote`). */
const GEO_SCOPED_REMOTE_PREFIX_RE =
  /\b(us|usa|u\.s\.a?\.?|uk|u\.k\.|eu|ca|canada|india|germany|france|australia|poland|ireland|netherlands|spain|italy|mexico|brazil|japan|singapore)\s+remote\b/gi;

const GEO_SCOPED_REMOTE_SUFFIX_RE =
  /\bremote\s*(?:[-–—:,/]\s*|\s+)(us|usa|u\.s\.a?\.?|uk|u\.k\.|eu|ca|canada|india|germany|france|australia|poland|ireland|netherlands|spain|italy|mexico|brazil|japan|singapore)(?:\b|$)/gi;

const GEO_SCOPED_REMOTE_REGION_PREFIX_RE =
  /\b(emea|apac|latam|mena|noram|nordics|dach|iberia)\s+remote\b/gi;

const GEO_SCOPED_REMOTE_REGION_SUFFIX_RE =
  /\bremote\s*(?:[-–—:,/]\s*|\s+)(emea|apac|latam|mena|noram|nordics|dach|iberia)(?:\b|$)/gi;

function countryFromGeoScopedRemoteToken(token: string): string | null {
  const cleaned = token.toLowerCase().replace(/\./g, '').trim();
  if (!cleaned) {
    return null;
  }
  const hint = canonicalizeCountryHint(cleaned);
  return KNOWN_COUNTRIES.has(hint) ? hint : null;
}

/**
 * Parses country tokens glued to “remote” in titles (e.g. `US Remote` → united states).
 * Safer than allowing bare `us` in generic title country extraction.
 */
export function extractCountriesFromGeoScopedRemoteText(
  text: string,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const found = new Set<string>();
  for (const re of [GEO_SCOPED_REMOTE_PREFIX_RE, GEO_SCOPED_REMOTE_SUFFIX_RE]) {
    re.lastIndex = 0;
    let match = re.exec(trimmed);
    while (match) {
      const country = countryFromGeoScopedRemoteToken(match[1] ?? '');
      if (country) {
        found.add(country);
      }
      match = re.exec(trimmed);
    }
  }
  return Array.from(found);
}

export function textImpliesGeoScopedRemote(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (extractCountriesFromGeoScopedRemoteText(trimmed).length > 0) {
    return true;
  }
  return (
    GEO_SCOPED_REMOTE_REGION_PREFIX_RE.test(trimmed) ||
    GEO_SCOPED_REMOTE_REGION_SUFFIX_RE.test(trimmed)
  );
}

/**
 * Short country/region codes allowed in job titles (excludes e.g. `us` / `in` to avoid
 * English-word false positives like “tell us” / “checking in”).
 */
const TITLE_COUNTRY_ALIAS_ALLOW_SHORT = new Set([
  'usa',
  'uae',
  'uk',
  'eu',
  /** ISO 3166-1 alpha-2 in parentheses after cities (e.g. `Zürich (CH)`). */
  'ch',
]);

const TITLE_COUNTRY_ALIAS_MIN_LENGTH = 4;

function buildTitleCountryPhraseEntries(): ReadonlyArray<{
  phrase: string;
  country: string;
}> {
  const byPhrase = new Map<string, string>();

  for (const country of KNOWN_COUNTRIES) {
    byPhrase.set(country.toLowerCase(), country);
  }

  for (const [alias, canon] of Object.entries(COUNTRY_ALIASES)) {
    if (!KNOWN_COUNTRIES.has(canon)) {
      continue;
    }
    const phrase = alias.trim().toLowerCase();
    if (!phrase) {
      continue;
    }
    const okLength =
      phrase.length >= TITLE_COUNTRY_ALIAS_MIN_LENGTH ||
      TITLE_COUNTRY_ALIAS_ALLOW_SHORT.has(phrase);
    if (!okLength) {
      continue;
    }
    if (!byPhrase.has(phrase)) {
      byPhrase.set(phrase, canon);
    }
  }

  return [...byPhrase.entries()]
    .map(([phrase, country]) => ({ phrase, country }))
    .sort((a, b) => b.phrase.length - a.phrase.length);
}

const TITLE_COUNTRY_PHRASE_ENTRIES = buildTitleCountryPhraseEntries();

function phraseMatchesAsCountryMention(
  haystack: string,
  phrase: string,
): boolean {
  const esc = escapeRegExp(phrase);
  const re = new RegExp(
    `(^|[^\\p{L}\\p{M}\\p{N}])${esc}([^\\p{L}\\p{M}\\p{N}]|$)`,
    'u',
  );
  return re.test(haystack);
}

/**
 * Detects canonical country names from `KNOWN_COUNTRIES` (and safe aliases) in free text.
 * Callers should use this only when location-derived `locationCountries` / facets are empty,
 * so titles do not override parsed geography.
 */
export function extractCountryMentionsFromText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const haystack = trimmed.normalize('NFC').toLowerCase();
  const found = new Set<string>();
  for (const { phrase, country } of TITLE_COUNTRY_PHRASE_ENTRIES) {
    if (phraseMatchesAsCountryMention(haystack, phrase)) {
      found.add(country);
    }
  }
  return Array.from(found);
}

const ISO3166_ALPHA2_DISPLAY = new Intl.DisplayNames(['en'], {
  type: 'region',
});

/**
 * Resolve ISO 3166-1 alpha-2 codes (e.g. Lever `country: "ES"`) to {@link KNOWN_COUNTRIES} tokens.
 * Skips US/CA province postals that share two-letter codes.
 */
function countryFromIso3166Alpha2(code: string): string | null {
  if (!/^[a-z]{2}$/.test(code)) {
    return null;
  }
  try {
    const display = ISO3166_ALPHA2_DISPLAY.of(code.toUpperCase());
    if (!display) {
      return null;
    }
    const lower = display.normalize('NFC').toLowerCase();
    if (KNOWN_COUNTRIES.has(lower)) {
      return lower;
    }
    const aliased = COUNTRY_ALIASES[lower];
    if (aliased && KNOWN_COUNTRIES.has(aliased)) {
      return aliased;
    }
    if (code === 'ci') {
      return COTE_DIVOIRE;
    }
  } catch {
    return null;
  }
  // US/CA province postals share ISO alpha-2 codes; only treat as subnational when not a country.
  if (
    Object.prototype.hasOwnProperty.call(US_STATE_POSTAL_TO_TOKEN, code) ||
    Object.prototype.hasOwnProperty.call(CANADA_PROVINCE_POSTAL_TO_TOKEN, code)
  ) {
    return null;
  }
  return null;
}

/**
 * Canonicalize provider-supplied country hints (e.g. `USA` -> `united states`)
 * to match stored facet country vocabulary.
 */
export function canonicalizeCountryHint(countryHint: string): string {
  const normalized = countryHint.trim().toLowerCase();
  if (!normalized) {
    return normalized;
  }
  const mappedCountry = COUNTRY_ALIASES[normalized];
  if (mappedCountry) {
    return mappedCountry;
  }
  const fromIso2 = countryFromIso3166Alpha2(normalized);
  if (fromIso2) {
    return fromIso2;
  }
  const mappedRegion = REGION_ALIASES[normalized];
  if (mappedRegion) {
    return mappedRegion;
  }
  return normalized;
}

/**
 * Splits provider hint strings like `US | EU` or `US, CA` and canonicalizes each part.
 */
export function splitAndCanonicalizeCountryHints(
  countryHints: string[],
): string[] {
  const expanded: string[] = [];
  for (const hint of countryHints) {
    const parts = hint
      .split(/[|,;/]/g)
      .map((part) => canonicalizeCountryHint(part))
      .filter((part) => part.length > 0);
    expanded.push(...parts);
  }
  return Array.from(new Set(expanded));
}

/** Region hint tokens merged from provider country hints (mirrors job-process.processor). */
export const PROVIDER_REGION_COUNTRY_HINTS = new Set<string>([
  'apac',
  'emea',
  'latam',
  'mena',
  'americas',
  'north america',
  'south america',
  'asia',
  'europe',
  'european union',
  'eu',
  'east coast',
  'west coast',
]);

/**
 * Merge parsed location facets with provider country/region hints (e.g. Lever ISO `country`).
 */
export function mergeLocationFacetsWithCountryHints(
  facets: LocationFacets,
  countryHints: string[],
): LocationFacets {
  const hinted = countryHints
    .map((country) => country.trim().toLowerCase())
    .filter((country) => country.length > 0);
  if (hinted.length === 0) {
    return facets;
  }

  const regionHints = hinted.filter((hint) =>
    PROVIDER_REGION_COUNTRY_HINTS.has(hint),
  );
  const countryParts = splitAndCanonicalizeCountryHints(
    hinted.filter((hint) => !PROVIDER_REGION_COUNTRY_HINTS.has(hint)),
  ).filter(
    (hint) =>
      KNOWN_COUNTRIES.has(hint) ||
      (COUNTRY_ALIASES[hint] && KNOWN_COUNTRIES.has(COUNTRY_ALIASES[hint])),
  );

  const mergedCountries = new Set<string>([
    ...facets.countries,
    ...countryParts,
  ]);
  const mergedRegions = new Set<string>([...facets.regions, ...regionHints]);
  const mergedTokens = new Set<string>([
    ...facets.tokens,
    ...mergedCountries,
    ...mergedRegions,
  ]);

  return {
    tokens: Array.from(mergedTokens),
    countries: Array.from(mergedCountries),
    regions: Array.from(mergedRegions),
  };
}

/** Normalize country facet arrays for comparison (drops unmapped ISO-2 leftovers). */
export function normalizeCountriesForFacetCompare(
  countries: string[],
): string[] {
  const out = new Set<string>();
  for (const country of countries) {
    const canon = canonicalizeCountryHint(country);
    if (KNOWN_COUNTRIES.has(canon)) {
      out.add(canon);
    }
  }
  return Array.from(out).sort();
}

/** Normalize region facet arrays for comparison. */
export function normalizeRegionsForFacetCompare(regions: string[]): string[] {
  const out = new Set<string>();
  for (const region of regions) {
    const canon = canonicalizeCountryHint(region);
    if (isCanonicalRegionToken(canon)) {
      out.add(canon);
    }
  }
  return Array.from(out).sort();
}

const CANONICAL_REGION_TOKENS = new Set<string>(Object.values(REGION_ALIASES));

export function isCanonicalRegionToken(token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return CANONICAL_REGION_TOKENS.has(normalized);
}
