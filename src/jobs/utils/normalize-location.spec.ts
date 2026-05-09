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

  it('maps edinburgh to united kingdom', () => {
    const facets = extractLocationFacets('Edinburgh');

    expect(facets.countries).toContain('united kingdom');
    expect(facets.tokens).toContain('edinburgh');
    expect(facets.tokens).toContain('united kingdom');
  });

  it('maps guildford to united kingdom', () => {
    const facets = extractLocationFacets('Guildford');

    expect(facets.countries).toContain('united kingdom');
    expect(facets.tokens).toContain('guildford');
    expect(facets.tokens).toContain('united kingdom');
  });

  it('maps seattle metro to united states', () => {
    const facets = extractLocationFacets('Seattle Metro');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('seattle');
    expect(facets.tokens).toContain('united states');
    expect(facets.tokens).not.toContain('seattle metro');
  });

  it('maps austin tx to united states', () => {
    const facets = extractLocationFacets('Austin TX');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['austin', 'texas', 'united states']),
    );
    expect(facets.tokens).not.toContain('austin tx');
  });

  it('maps oklahoma to united states', () => {
    const facets = extractLocationFacets('Oklahoma');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('oklahoma');
    expect(facets.tokens).toContain('united states');
  });

  it('maps nashville to united states', () => {
    const facets = extractLocationFacets('Nashville');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('nashville');
    expect(facets.tokens).toContain('united states');
  });

  it('maps houston to united states', () => {
    const facets = extractLocationFacets('Houston');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('houston');
    expect(facets.tokens).toContain('united states');
  });

  it('maps pittsburgh area to united states', () => {
    const facets = extractLocationFacets('Pittsburgh Area');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('pittsburgh');
    expect(facets.tokens).toContain('united states');
    expect(facets.tokens).not.toContain('pittsburgh area');
  });

  it('maps miami area to united states', () => {
    const facets = extractLocationFacets('Miami Area');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('miami');
    expect(facets.tokens).toContain('united states');
    expect(facets.tokens).not.toContain('miami area');
  });

  it('maps washington d.c. to united states', () => {
    const facets = extractLocationFacets('Washington D.C.');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['washington', 'district of columbia', 'united states']),
    );
  });

  it('maps Berlin, DE and Stuttgart, DE to Germany (ISO), not Delaware', () => {
    const berlin = extractLocationFacets('Berlin, DE');
    expect(berlin.countries).toContain('germany');
    expect(berlin.countries).not.toContain('united states');
    expect(berlin.tokens).not.toContain('delaware');

    const stuttgart = extractLocationFacets('Stuttgart, DE');
    expect(stuttgart.countries).toContain('germany');
    expect(stuttgart.countries).not.toContain('united states');
    expect(stuttgart.tokens).not.toContain('delaware');
  });

  it('still maps Wilmington, DE to United States (Delaware)', () => {
    const facets = extractLocationFacets('Wilmington, DE');
    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('delaware');
  });

  it('maps Amsterdam, NL to Netherlands (ISO), not Newfoundland (Canada)', () => {
    const facets = extractLocationFacets('Amsterdam, NL');
    expect(facets.countries).toContain('netherlands');
    expect(facets.countries).not.toContain('canada');
    expect(facets.tokens).not.toContain('newfoundland and labrador');
  });

  it('maps plain Newfoundland postal NL to Canada when no Dutch city hint', () => {
    const facets = extractLocationFacets("St. John's, NL");
    expect(facets.countries).toContain('canada');
    expect(facets.countries).not.toContain('netherlands');
  });

  it('maps Düsseldorf, DE to Germany only', () => {
    const facets = extractLocationFacets('Düsseldorf, DE');
    expect(facets.countries).toContain('germany');
    expect(facets.countries).not.toContain('united states');
  });

  it('maps Atlanta, Georgia to United States only (US state, not country Georgia)', () => {
    const facets = extractLocationFacets('Atlanta, Georgia');
    expect(facets.countries).toEqual(['united states']);
    expect(facets.countries).not.toContain('georgia');
  });

  it('maps Ljubljana, Montpellier, Netanya, Gurgaon, and Oxford city hints to countries', () => {
    expect(extractLocationFacets('Ljubljana').countries).toContain('slovenia');
    expect(extractLocationFacets('Montpellier').countries).toContain('france');
    expect(extractLocationFacets('Netanya').countries).toContain('israel');
    expect(extractLocationFacets('Gurgaon').countries).toContain('india');
    expect(extractLocationFacets('Oxford').countries).toContain('united kingdom');
  });

  it('maps Geneva to Switzerland and splits Montreal & Toronto for Canada', () => {
    expect(extractLocationFacets('Geneva').countries).toContain('switzerland');
    const both = extractLocationFacets('Montreal & Toronto');
    expect(both.countries).toContain('canada');
    expect(both.tokens).toEqual(expect.arrayContaining(['montreal', 'toronto', 'canada']));
  });

  it('maps Raleigh and Herndon to united states and parses United States & Canada (Remote)', () => {
    expect(extractLocationFacets('Raleigh').countries).toContain('united states');
    expect(extractLocationFacets('Herndon').countries).toContain('united states');
    const na = extractLocationFacets('United States & Canada (Remote)');
    expect(na.countries).toEqual(
      expect.arrayContaining(['united states', 'canada']),
    );
    expect(extractLocationFacets('Canada & United States (Remote)').countries).toEqual(
      expect.arrayContaining(['united states', 'canada']),
    );
  });

  it('adds countries for US state phrases, multi-city postal, India suffix, ISO UK/CH, NL/DK cities', () => {
    expect(extractLocationFacets('Shreveport, Louisiana').countries).toContain(
      'united states',
    );
    const multi = extractLocationFacets(
      'Denver CO, Atlanta GA, Chicago IL, San Diego CA, Los Angeles CA, Salt Lake City UT',
    );
    expect(multi.countries).toContain('united states');

    expect(extractLocationFacets('Bentonville').countries).toContain('united states');

    expect(extractLocationFacets('Cincinnati').countries).toContain('united states');

    expect(extractLocationFacets('Mumbai India').countries).toContain('india');
    expect(extractLocationFacets('Rotterdam').countries).toContain('netherlands');
    expect(extractLocationFacets('Haarlem').countries).toContain('netherlands');
    expect(extractLocationFacets('The Randstad').countries).toContain('netherlands');

    expect(extractLocationFacets('Hillerød').countries).toContain('denmark');
    expect(extractLocationFacets('Greve').countries).toContain('denmark');
    expect(extractLocationFacets('Esbjerg').countries).toContain('denmark');
    expect(extractLocationFacets('Roskilde').countries).toContain('denmark');
    expect(extractLocationFacets('Silkeborg').countries).toContain('denmark');
    expect(extractLocationFacets('Vejle').countries).toContain('denmark');

    const lonCh = extractLocationFacets('London UK, Geneva CH');
    expect(lonCh.countries).toEqual(
      expect.arrayContaining(['united kingdom', 'switzerland']),
    );
  });

  it('maps us east coast to east coast region', () => {
    const facets = extractLocationFacets('US East Coast');

    expect(facets.regions).toContain('east coast');
    expect(facets.tokens).toContain('east coast');
    expect(facets.tokens).not.toContain('us east coast');
  });

  it('normalizes amsterdam l remote to amsterdam and netherlands', () => {
    const facets = extractLocationFacets(
      'Paris | Remote | Amsterdam l Remote | Barcelona | Berlin | Dublin | Lisbon | London | Relocation to Europe | Rome',
    );

    expect(facets.tokens).toContain('amsterdam');
    expect(facets.tokens).not.toContain('amsterdam l');
    expect(facets.countries).toContain('netherlands');
  });

  it('maps new kensington to united states', () => {
    const facets = extractLocationFacets('New Kensington');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('new kensington');
    expect(facets.tokens).toContain('united states');
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

  it('maps noida to india', () => {
    const facets = extractLocationFacets('Noida');

    expect(facets.countries).toContain('india');
    expect(facets.tokens).toContain('noida');
    expect(facets.tokens).toContain('india');
  });

  it('maps cluj to romania', () => {
    const facets = extractLocationFacets('Cluj');

    expect(facets.countries).toContain('romania');
    expect(facets.tokens).toContain('cluj');
    expect(facets.tokens).toContain('romania');
  });

  it('maps nice to france', () => {
    const facets = extractLocationFacets('Nice');

    expect(facets.countries).toContain('france');
    expect(facets.tokens).toContain('nice');
    expect(facets.tokens).toContain('france');
  });

  it('maps monterrey to mexico', () => {
    const facets = extractLocationFacets('Monterrey');

    expect(facets.countries).toContain('mexico');
    expect(facets.tokens).toContain('monterrey');
    expect(facets.tokens).toContain('mexico');
  });

  it('canonicalizes méxico to mexico', () => {
    const facets = extractLocationFacets('México');

    expect(facets.countries).toContain('mexico');
    expect(facets.tokens).toContain('mexico');
    expect(facets.tokens).not.toContain('méxico');
  });

  it('canonicalizes viet nam and vietnam2 to vietnam', () => {
    const facets = extractLocationFacets('Vietnam | Viet Nam | Vietnam2');

    expect(facets.countries).toContain('vietnam');
    expect(facets.tokens).toContain('vietnam');
    expect(facets.tokens).not.toEqual(
      expect.arrayContaining(['viet nam', 'vietnam2']),
    );
  });

  it('maps dnipro to ukraine', () => {
    const facets = extractLocationFacets('Dnipro');

    expect(facets.countries).toContain('ukraine');
    expect(facets.tokens).toContain('dnipro');
    expect(facets.tokens).toContain('ukraine');
  });

  it('maps kiev to ukraine', () => {
    const facets = extractLocationFacets('Kiev');

    expect(facets.countries).toContain('ukraine');
    expect(facets.tokens).toContain('kiev');
    expect(facets.tokens).toContain('ukraine');
  });

  it('recognizes algeria as a country token', () => {
    const facets = extractLocationFacets('Algeria');

    expect(facets.countries).toContain('algeria');
    expect(facets.tokens).toContain('algeria');
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

  it('maps us-based to united states', () => {
    const facets = extractLocationFacets('US-based');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('united states');
    expect(facets.tokens).not.toContain('us-based');
  });

  it('maps india team to india', () => {
    const facets = extractLocationFacets('India Team');

    expect(facets.countries).toContain('india');
    expect(facets.tokens).toContain('india');
    expect(facets.tokens).not.toContain('india team');
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

  it('drops any location placeholders from tokens and countries', () => {
    const facets = extractLocationFacets(
      'Any Location | Vietnam | Turkey | Malaysia',
    );

    expect(facets.tokens).not.toContain('any location');
    expect(facets.countries).not.toContain('any location');
    expect(facets.countries).toEqual(
      expect.arrayContaining(['vietnam', 'turkey', 'malaysia']),
    );
  });

  it('splits united states and emea mixed connector into country and region', () => {
    const facets = extractLocationFacets('United States & EMEA');

    expect(facets.countries).toContain('united states');
    expect(facets.regions).toContain('emea');
    expect(facets.tokens).toEqual(
      expect.arrayContaining(['united states', 'emea']),
    );
    expect(facets.tokens).not.toContain('united states & emea');
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

  it('maps pisa to italy', () => {
    const facets = extractLocationFacets('Pisa');

    expect(facets.countries).toContain('italy');
    expect(facets.tokens).toContain('pisa');
    expect(facets.tokens).toContain('italy');
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

  it('maps south australia to australia', () => {
    const facets = extractLocationFacets('South Australia');

    expect(facets.countries).toContain('australia');
    expect(facets.tokens).toContain('south australia');
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

  it('maps dar es salam typo to tanzania', () => {
    const facets = extractLocationFacets('Dar Es Salam');

    expect(facets.countries).toContain('tanzania');
    expect(facets.tokens).toContain('dar es salam');
    expect(facets.tokens).toContain('tanzania');
  });

  it('maps johannesburg to south africa', () => {
    const facets = extractLocationFacets('Johannesburg');

    expect(facets.countries).toContain('south africa');
    expect(facets.tokens).toContain('johannesburg');
    expect(facets.tokens).toContain('south africa');
  });

  it('maps johannesburg warehouse to south africa', () => {
    const facets = extractLocationFacets('Johannesburg Warehouse');

    expect(facets.countries).toContain('south africa');
    expect(facets.tokens).toContain('johannesburg');
    expect(facets.tokens).not.toContain('johannesburg warehouse');
  });

  it('maps virtual us to united states', () => {
    const facets = extractLocationFacets('VIRTUAL US');

    expect(facets.countries).toContain('united states');
    expect(facets.tokens).toContain('united states');
  });

  it('keeps nordics and emea as regions, not countries', () => {
    const facets = extractLocationFacets('Norway | Nordics | EMEA');

    expect(facets.countries).toEqual(['norway']);
    expect(facets.regions).toEqual(
      expect.arrayContaining(['nordics', 'emea']),
    );
    expect(facets.countries).not.toContain('nordics');
  });

  it('maps missing country aliases from audit block without congo', () => {
    const facets = extractLocationFacets(
      'San Marino | Mauritius | Brunei | Oman | Mongolia | Madagascar | Tunis | Singapoor | Algiers | Constantine | Oran | Anaba',
    );

    expect(facets.countries).toEqual(
      expect.arrayContaining([
        'san marino',
        'mauritius',
        'brunei',
        'oman',
        'mongolia',
        'madagascar',
        'tunisia',
        'singapore',
        'algeria',
      ]),
    );
  });

  it('maps congo brazzaville variants to congo - brazzaville', () => {
    const facetsFromRaw = extractLocationFacets('Congo Brazzaville');
    const facetsFromAlias = extractLocationFacets('Republic of the Congo');

    expect(facetsFromRaw.countries).toContain('congo - brazzaville');
    expect(facetsFromRaw.tokens).toContain('congo - brazzaville');
    expect(facetsFromAlias.countries).toContain('congo - brazzaville');
    expect(facetsFromAlias.tokens).toContain('congo - brazzaville');
  });

  it('maps remote philipines typo to philippines', () => {
    const facets = extractLocationFacets('Remote - Philipines');

    expect(facets.countries).toContain('philippines');
    expect(facets.tokens).toContain('philippines');
    expect(facets.tokens).not.toContain('philipines');
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

  it('canonicalizes CAN to canada', () => {
    expect(canonicalizeCountryHint('CAN')).toBe('canada');
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
