import {
  canonicalizeCountryHint,
  extractLocationFacets,
  isCanonicalRegionToken,
  splitAndCanonicalizeCountryHints,
} from './normalize-location';

describe('extractLocationFacets', () => {
  it('keeps both countries for remote pipe-plus-hyphen chains', () => {
    const facets = extractLocationFacets('Remote U.S. | Remote - Canada');

    expect(facets.countries).toEqual(
      expect.arrayContaining(['united states', 'canada']),
    );
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['united states', 'canada']),
    );
  });

  it('canonicalizes remote U.S. to united states only', () => {
    const facets = extractLocationFacets('Remote U.S.');

    expect(facets.countries).toContain('united states');
    expect(facets.countries).not.toContain('usa');
    expect(facets.tokens).toContain('united states');
    expect(facets.tokens).not.toContain('usa');
  });

  it('canonicalizes czech republic token and country to czechia', () => {
    const facets = extractLocationFacets('Czech Republic | Germany');

    expect(facets.countries).toContain('czechia');
    expect(facets.countries).not.toContain('czech republic');
    expect(facets.tokens).toContain('czechia');
    expect(facets.tokens).not.toContain('czech republic');
    expect(facets.countries).toContain('germany');
    expect(facets.tokens).toContain('germany');
  });

  it('canonicalizes CZE prefix to czechia without raw cze token', () => {
    const facets = extractLocationFacets('CZE - Brno');

    expect(facets.countries).toContain('czechia');
    expect(facets.tokens).toContain('czechia');
    expect(facets.tokens).toContain('brno');
    expect(facets.tokens).not.toContain('cze');
  });

  it('canonicalizes IND, IRL, and CZE prefixes to country names', () => {
    const facets = extractLocationFacets(
      'CZE - Prague | IND - Chennai | IRL - Dublin | CZE - Brno',
    );

    expect(facets.tokens).toEqual(
      expect.arrayContaining([
        'czechia',
        'india',
        'ireland',
        'prague',
        'chennai',
        'dublin',
        'brno',
      ]),
    );
    expect(facets.tokens).not.toEqual(
      expect.arrayContaining(['cze', 'ind', 'irl']),
    );
    expect(facets.countries).toEqual(
      expect.arrayContaining(['czechia', 'india', 'ireland']),
    );
  });

  it('canonicalizes bosnia aliases to bosnia & herzegovina', () => {
    const facets = extractLocationFacets(
      'Bosnia and Herzegovina | Bosnia & Herzegovina',
    );

    expect(facets.countries).toContain('bosnia & herzegovina');
    expect(facets.countries).not.toContain('bosnia and herzegovina');
    expect(facets.tokens).toContain('bosnia & herzegovina');
    expect(facets.tokens).not.toContain('bosnia and herzegovina');
  });

  it('keeps only european union token for EU aliases', () => {
    const facets = extractLocationFacets('European Union | EU');

    expect(facets.tokens).toContain('european union');
    expect(facets.tokens).not.toContain('eu');
    expect(facets.regions).toContain('european union');
  });

  it('keeps only latin america token for LATAM aliases', () => {
    const facets = extractLocationFacets('Latin America | LATAM');

    expect(facets.tokens).toContain('latin america');
    expect(facets.tokens).not.toContain('latam');
    expect(facets.regions).toContain('latin america');
  });

  it('keeps central america as its own region token', () => {
    const facets = extractLocationFacets('Central America');

    expect(facets.tokens).toContain('central america');
    expect(facets.regions).toContain('central america');
    expect(facets.tokens).not.toContain('latin america');
  });

  it('keeps only north america token for NAMER alias', () => {
    const facets = extractLocationFacets('NAMER');

    expect(facets.tokens).toContain('north america');
    expect(facets.tokens).not.toContain('namer');
    expect(facets.regions).toContain('north america');
  });

  it('maps istanbul and lisboa city aliases to countries', () => {
    const facets = extractLocationFacets('Istanbul | Warsaw | Lisboa');

    expect(facets.countries).toEqual(
      expect.arrayContaining(['turkey', 'poland', 'portugal']),
    );
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['istanbul', 'warsaw', 'lisboa']),
    );
  });

  it('maps liverpool to united kingdom', () => {
    const facets = extractLocationFacets('Liverpool');

    expect(facets.countries).toContain('united kingdom');
    expect(facets.tokens).toContain('liverpool');
    expect(facets.tokens).toContain('united kingdom');
  });

  it('maps glasgow to united kingdom', () => {
    const facets = extractLocationFacets('Glasgow');

    expect(facets.countries).toContain('united kingdom');
    expect(facets.tokens).toContain('glasgow');
    expect(facets.tokens).toContain('united kingdom');
  });

  it('maps turku to finland', () => {
    const facets = extractLocationFacets('Turku');

    expect(facets.countries).toContain('finland');
    expect(facets.tokens).toContain('turku');
    expect(facets.tokens).toContain('finland');
  });

  it('maps tampere to finland', () => {
    const facets = extractLocationFacets('Tampere');

    expect(facets.countries).toContain('finland');
    expect(facets.tokens).toContain('tampere');
    expect(facets.tokens).toContain('finland');
  });

  it('ignores CET timezone qualifiers in Europe remote strings', () => {
    const facets = extractLocationFacets('Remote, Europe (CET +/- 1h)');

    expect(facets.tokens).toContain('europe');
    expect(facets.regions).toContain('europe');
    expect(facets.tokens).not.toEqual(
      expect.arrayContaining(['cet', 'cest', '1h']),
    );
    expect(facets.countries).toEqual([]);
  });

  it('maps us full-time to united states only', () => {
    const facets = extractLocationFacets('US Full-time');

    expect(facets.countries).toEqual(['united states']);
    expect(facets.tokens).toContain('united states');
    expect(facets.tokens).not.toContain('us full-time');
  });

  it('keeps both countries for remote us and canada strings', () => {
    const facets = extractLocationFacets('Remote - US & Canada');

    expect(facets.countries).toEqual(
      expect.arrayContaining(['united states', 'canada']),
    );
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['united states', 'canada']),
    );
  });

  it('maps aarhus to denmark', () => {
    const facets = extractLocationFacets('Aarhus');

    expect(facets.countries).toContain('denmark');
    expect(facets.tokens).toContain('aarhus');
    expect(facets.tokens).toContain('denmark');
  });

  it('maps orange county to california and united states', () => {
    const facets = extractLocationFacets('Orange County');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['orange county', 'california', 'united states']),
    );
  });

  it('maps recklinghausen to germany', () => {
    const facets = extractLocationFacets('Recklinghausen');

    expect(facets.countries).toContain('germany');
    expect(facets.tokens).toContain('recklinghausen');
    expect(facets.tokens).toContain('germany');
  });

  it('maps erding to germany', () => {
    const facets = extractLocationFacets('Erding');

    expect(facets.countries).toContain('germany');
    expect(facets.tokens).toContain('erding');
    expect(facets.tokens).toContain('germany');
  });

  it('maps taranaki to new zealand', () => {
    const facets = extractLocationFacets('Taranaki');

    expect(facets.countries).toContain('new zealand');
    expect(facets.tokens).toContain('taranaki');
    expect(facets.tokens).toContain('new zealand');
  });

  it('maps new south wales to australia', () => {
    const facets = extractLocationFacets('New South Wales');

    expect(facets.countries).toContain('australia');
    expect(facets.tokens).toContain('new south wales');
    expect(facets.tokens).toContain('australia');
  });

  it('maps queensland to australia', () => {
    const facets = extractLocationFacets('Queensland');

    expect(facets.countries).toContain('australia');
    expect(facets.tokens).toContain('queensland');
    expect(facets.tokens).toContain('australia');
  });

  it('maps manawatu to new zealand', () => {
    const facets = extractLocationFacets('Manawatu');

    expect(facets.countries).toContain('new zealand');
    expect(facets.tokens).toContain('manawatu');
    expect(facets.tokens).toContain('new zealand');
  });

  it('maps bay of plenty to new zealand', () => {
    const facets = extractLocationFacets('Bay of Plenty');

    expect(facets.countries).toContain('new zealand');
    expect(facets.tokens).toContain('bay of plenty');
    expect(facets.tokens).toContain('new zealand');
  });

  it('maps waikato to new zealand', () => {
    const facets = extractLocationFacets('Waikato');

    expect(facets.countries).toContain('new zealand');
    expect(facets.tokens).toContain('waikato');
    expect(facets.tokens).toContain('new zealand');
  });

  it('maps doha to qatar', () => {
    const facets = extractLocationFacets('Abu Dhabi | Doha');

    expect(facets.countries).toEqual(
      expect.arrayContaining(['united arab emirates', 'qatar']),
    );
    expect(facets.tokens).toContain('doha');
    expect(facets.tokens).toContain('qatar');
  });

  it('keeps nordics and emea as regions, not countries', () => {
    const facets = extractLocationFacets('Norway | Nordics | EMEA');

    expect(facets.countries).toEqual(['norway']);
    expect(facets.regions).toEqual(
      expect.arrayContaining(['nordics', 'emea']),
    );
    expect(facets.countries).not.toContain('nordics');
  });

  it('maps cayman alias to cayman islands country', () => {
    const facets = extractLocationFacets(
      'New York | Denver, Colorado | Cayman',
    );

    expect(facets.countries).toEqual(
      expect.arrayContaining(['united states', 'cayman islands']),
    );
    expect(facets.tokens).toContain('cayman islands');
    expect(facets.tokens).not.toContain('cayman');
  });
});

describe('canonicalizeCountryHint', () => {
  it('canonicalizes usa to united states', () => {
    expect(canonicalizeCountryHint('USA')).toBe('united states');
  });

  it('canonicalizes punctuated US aliases to united states', () => {
    expect(canonicalizeCountryHint('U.S.A')).toBe('united states');
    expect(canonicalizeCountryHint('U.S')).toBe('united states');
  });

  it('canonicalizes bosnia variants to ampersand form', () => {
    expect(canonicalizeCountryHint('Bosnia and Herzegovina')).toBe(
      'bosnia & herzegovina',
    );
    expect(canonicalizeCountryHint('Bosnia')).toBe('bosnia & herzegovina');
  });

  it('canonicalizes people republic of china to china', () => {
    expect(canonicalizeCountryHint("People's Republic of China")).toBe('china');
    expect(canonicalizeCountryHint('People’s Republic of China')).toBe('china');
  });
});

describe('splitAndCanonicalizeCountryHints', () => {
  it('splits and canonicalizes mixed delimiter hints', () => {
    expect(splitAndCanonicalizeCountryHints(['US | EU', 'U.S.A, Canada'])).toEqual(
      ['united states', 'european union', 'united states', 'canada'],
    );
  });
});

describe('isCanonicalRegionToken', () => {
  it('recognizes canonical region labels', () => {
    expect(isCanonicalRegionToken('nordics')).toBe(true);
    expect(isCanonicalRegionToken('emea')).toBe(true);
    expect(isCanonicalRegionToken('norway')).toBe(false);
  });
});
