export type SponsorVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'no_github_login' | 'not_sponsor' | 'http';
    };
