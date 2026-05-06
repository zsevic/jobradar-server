export function isAxiosTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return code === 'ECONNABORTED' || code === 'ETIMEDOUT';
}
