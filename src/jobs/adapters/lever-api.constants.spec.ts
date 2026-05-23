import {
  DEFAULT_LEVER_EU_POSTINGS_BASE_URL,
  DEFAULT_LEVER_US_POSTINGS_BASE_URL,
  resolveLeverPostingsBaseUrl,
} from './lever-api.constants';

describe('resolveLeverPostingsBaseUrl', () => {
  it('returns US default when region is us', () => {
    expect(resolveLeverPostingsBaseUrl('us')).toBe(
      DEFAULT_LEVER_US_POSTINGS_BASE_URL,
    );
  });

  it('returns EU default when region is eu', () => {
    expect(resolveLeverPostingsBaseUrl('eu')).toBe(
      DEFAULT_LEVER_EU_POSTINGS_BASE_URL,
    );
  });
});
