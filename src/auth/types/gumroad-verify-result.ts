export type GumroadVerifyFailureReason =
  | 'no_license'
  | 'invalid'
  | 'refunded'
  | 'chargebacked'
  | 'email_mismatch'
  | 'http';

export interface GumroadVerifyResult {
  ok: boolean;
  reason?: GumroadVerifyFailureReason;
}
