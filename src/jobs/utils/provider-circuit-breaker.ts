import { Injectable, Logger } from '@nestjs/common';
import { SourceProvider } from '../../database/entities/source.entity';

const WINDOW_MS = 1 * 60 * 1000;
const THRESHOLD = 10;
const COOLDOWN_MS = 5 * 60 * 1000;

interface ProviderState {
  timeouts: number[];
  openUntil: number | null;
}

@Injectable()
export class ProviderCircuitBreaker {
  private readonly logger = new Logger(ProviderCircuitBreaker.name);
  private readonly state = new Map<SourceProvider, ProviderState>();

  recordTimeout(provider: SourceProvider): void {
    const s = this.get(provider);
    const now = Date.now();
    s.timeouts = s.timeouts.filter((t) => now - t < WINDOW_MS);
    s.timeouts.push(now);
    if (s.timeouts.length >= THRESHOLD && (s.openUntil ?? 0) < now) {
      s.openUntil = now + COOLDOWN_MS;
      this.logger.warn(
        `Circuit OPEN for ${provider}: ${s.timeouts.length} timeouts in ${WINDOW_MS / 60_000}min, cooling down ${COOLDOWN_MS / 60_000}min`,
      );
    }
  }

  isOpen(provider: SourceProvider): boolean {
    const s = this.get(provider);
    if (s.openUntil != null && s.openUntil > Date.now()) {
      return true;
    }
    if (s.openUntil != null) {
      this.logger.log(`Circuit CLOSED for ${provider}`);
      s.openUntil = null;
    }
    return false;
  }

  private get(provider: SourceProvider): ProviderState {
    let s = this.state.get(provider);
    if (!s) {
      s = { timeouts: [], openUntil: null };
      this.state.set(provider, s);
    }
    return s;
  }
}
