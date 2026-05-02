export type ExtractedSeniority = 'junior' | 'mid' | 'senior' | 'staff';

/**
 * Extracts normalized seniority from a title string.
 * Precedence is highest level first: staff > senior > junior > mid.
 */
export function extractSeniorityFromTitle(
  title: string,
): ExtractedSeniority | null {
  const normalized = title
    .toLowerCase()
    .replace(/[.,/()_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return null;
  }

  const hasStaff =
    /\b(lead|principal|staff|head|architect|manager|director|vp|chief)\b/i.test(
      normalized,
    );
  if (hasStaff) {
    return 'staff';
  }

  const hasSenior = /\b(senior|sr|snr|expert|ssenior)\b/i.test(normalized);
  if (hasSenior) {
    return 'senior';
  }

  const hasJunior = /\b(junior|jr|entry level|graduate|intern|trainee)\b/i.test(
    normalized,
  );
  if (hasJunior) {
    return 'junior';
  }

  const hasMid = /\b(mid|middle|mid level|intermediate)\b/i.test(normalized);
  if (hasMid) {
    return 'mid';
  }

  return null;
}
