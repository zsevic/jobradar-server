import { canonicalizeCountryHint, extractLocationFacets } from './normalize-location';

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

  it('canonicalizes bosnia aliases to bosnia & herzegovina', () => {
    const facets = extractLocationFacets(
      'Bosnia and Herzegovina | Bosnia & Herzegovina',
    );

    expect(facets.countries).toContain('bosnia & herzegovina');
    expect(facets.countries).not.toContain('bosnia and herzegovina');
    expect(facets.tokens).toContain('bosnia & herzegovina');
    expect(facets.tokens).not.toContain('bosnia and herzegovina');
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
});
