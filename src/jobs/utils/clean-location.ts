export function cleanLocationAfterRemoteDetection(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return 'Unknown';
  }

  const cleaned = trimmed
    // remove standalone remote/anywhere tokens
    .replace(/\b(remote|anywhere)\b/gi, '')
    // collapse separators that may be left after token removal
    .replace(/\s*[-/|,]+\s*/g, ', ')
    // collapse repeated commas
    .replace(/,\s*,+/g, ', ')
    // trim leading/trailing commas and spaces
    .replace(/^[,\s]+|[,\s]+$/g, '')
    // normalize spacing
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned : 'Unknown';
}

export function formatRawLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return 'Unknown';
  }

  return trimmed
    .replace(/\s*;\s*/g, ', ')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
