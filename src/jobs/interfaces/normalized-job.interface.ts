import { SourceProvider } from '../../database/entities/source.entity';

export interface NormalizedJob {
  provider: SourceProvider;
  externalId: string;
  title: string;
  company: string;
  location: string;
  locationRaw: string;
  /** Optional country hints provided by source-specific structured locations (e.g. Ashby secondary locations). */
  locationCountryHints?: string[];
  /** Ashby/Workable: API/structured fields say remote while location text may be empty */
  remoteIndicatedByProvider?: boolean;
  isRemote: boolean;
  postedAt: Date;
  url: string;
  role: string | null;
  stack: string[];
  seniorities: string[];
}
