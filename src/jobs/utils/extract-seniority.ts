export type ExtractedSeniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff';

/**
 * Extracts normalized seniority from a title string.
 * Precedence: staff (incl. senior staff / distinguished / fellow) > L-levels >
 * Roman level suffixes > senior > intern > junior > mid.
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

  if (
    /\b(senior\s+staff|sr\s+staff|distinguished|fellow)\b/i.test(normalized) ||
    /\b(lead|principal|head|architect|manager|director|vp|chief)\b/i.test(
      normalized,
    ) ||
    // IC "Member of Technical Staff" contains the word "staff" — exclude that phrase.
    /(?<!\btechnical\s)\bstaff\b/i.test(normalized)
  ) {
    return 'staff';
  }

  const lLevel = normalized.match(/\bl(\d{1,2})\b/i);
  if (lLevel) {
    const n = Number.parseInt(lLevel[1], 10);
    if (n >= 6) return 'staff';
    if (n === 5) return 'senior';
    if (n === 4) return 'mid';
    if (n >= 1) return 'junior';
  }

  const roman = normalized.match(
    /\b(?:software\s+(?:development\s+)?engineer|software\s+developer|software\s+engineering|member\s+of\s+technical\s+staff|engineer|developer|sde|swe|mts)\s+(iv|i{1,3})\b/i,
  );
  if (roman) {
    const r = roman[1];
    if (r === 'iv') return 'staff';
    if (r === 'iii') return 'senior';
    if (r === 'ii') return 'mid';
    if (r === 'i') return 'junior';
  }

  if (/\b(senior|sr|snr|expert|ssenior)\b/i.test(normalized)) {
    return 'senior';
  }

  if (/\b(intern|internship)\b/i.test(normalized)) {
    return 'intern';
  }

  if (
    /\b(junior|jr|entry\s+level|graduate|trainee|new\s+grad(?:uate)?|early\s+career|apprentice(?:ship)?)\b/i.test(
      normalized,
    )
  ) {
    return 'junior';
  }

  if (/\b(mid|middle|mid\s+level|intermediate)\b/i.test(normalized)) {
    return 'mid';
  }

  return null;
}
