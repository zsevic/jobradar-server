export interface GumroadLicenseResponse {
  success: boolean;
  message?: string;
  purchase?: {
    email?: string;
    test?: boolean;
    refunded?: boolean;
    chargebacked?: boolean;
  };
}
