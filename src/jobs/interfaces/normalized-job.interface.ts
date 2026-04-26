import { SourceProvider } from '../../database/entities/source.entity';

export interface NormalizedJob {
  provider: SourceProvider;
  externalId: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  postedAt: Date;
  url: string;
  role: string | null;
  stack: string[];
  seniority: string | null;
}
