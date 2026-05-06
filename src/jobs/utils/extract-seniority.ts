export type ExtractedSeniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff';

const SENIORITY_ORDER: ExtractedSeniority[] = [
  'intern',
  'junior',
  'mid',
  'senior',
  'staff',
];

/** Whole-token Roman / Arabic level suffixes (ordered longest-first). `i\\b` avoids matching `intern`. */
const LEVEL_TOKEN = '(?:iv|iii|ii|i\\b|[1-5])';

function tokenToLevel(token: string): ExtractedSeniority {
  const s = token.toLowerCase();
  if (s === 'iv' || s === '4' || s === '5') return 'staff';
  if (s === 'iii' || s === '3') return 'senior';
  if (s === 'ii' || s === '2') return 'mid';
  return 'junior';
}

function expandInclusive(levels: ExtractedSeniority[]): ExtractedSeniority[] {
  if (levels.length === 0) {
    return [];
  }
  const indices = levels.map((l) => SENIORITY_ORDER.indexOf(l));
  const min = Math.min(...indices);
  const max = Math.max(...indices);
  return SENIORITY_ORDER.slice(min, max + 1);
}

/**
 * Extracts normalized seniority bucket(s) from a title string.
 * Band titles like "Engineer II – IV" expand inclusively (mid … staff).
 * Unknown titles yield an empty array.
 *
 * Precedence: intern / junior (explicit early-career) > mid–senior phrase
 * (beats leadership words like manager) > senior lead / senior principal (IC
 * band) > staff (incl. leadership keywords) > L-levels > Roman / Arabic level
 * suffix lists > senior keyword > mid keyword.
 */
export function extractSeniorityFromTitle(
  title: string,
): ExtractedSeniority[] {
  const normalized = title
    .toLowerCase()
    .replace(/[.,/()_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return [];
  }

  if (/\b(intern|internship)\b/i.test(normalized)) {
    return ['intern'];
  }

  if (
    /\b(junior|jr|entry\s+level|graduate|trainee|new\s+grad(?:uate)?|early\s+career|apprentice(?:ship)?)\b/i.test(
      normalized,
    )
  ) {
    return ['junior'];
  }

  // "Mid-Senior", "Mid | Senior", "mid/senior" normalize to `mid senior`. Must run
  // before leadership keywords so "… Manager | Mid-Senior" is not forced to staff.
  if (/\bmid\s+senior\b/i.test(normalized)) {
    return ['mid', 'senior'];
  }

  // "Senior/Lead", "Senior or Lead", "Senior/Principal" — IC band; must run before `lead` / `principal` in staff.
  if (/\bsenior\s+(?:or\s+)?(?:lead|principal)\b/i.test(normalized)) {
    return ['senior', 'staff'];
  }

  if (
    /\b(senior\s+staff|sr\s+staff|distinguished|fellow)\b/i.test(normalized) ||
    /(?:\blead(?!\s+(?:the|a|an)\b)|\bprincipal\b|\bhead\b|\barchitect\b|\bmanager\b|\bdirector\b|\bvp\b|\bchief\b)/i.test(
      normalized,
    ) ||
    /(?<!\btechnical\s)\bstaff\b/i.test(normalized)
  ) {
    return ['staff'];
  }

  const lLevel = normalized.match(/\bl(\d{1,2})\b/i);
  if (lLevel) {
    const n = Number.parseInt(lLevel[1], 10);
    if (n >= 6) return ['staff'];
    if (n === 5) return ['senior'];
    if (n === 4) return ['mid'];
    if (n >= 1) return ['junior'];
  }

  const levelTail = normalized.match(
    new RegExp(
      `\\b(?:software\\s+(?:development\\s+)?engineer|software\\s+developer|software\\s+engineering|member\\s+of\\s+technical\\s+staff|engineer|developer|sde|swe|mts)(?:\\s+(?:level|lvl))?\\s+(${LEVEL_TOKEN}(?:\\s+${LEVEL_TOKEN})*)`,
      'i',
    ),
  );
  if (levelTail) {
    const tokens = levelTail[1]
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const levels = tokens.map(tokenToLevel);
    return expandInclusive(levels);
  }

  if (/\b(senior|sr|snr|expert|ssenior)\b/i.test(normalized)) {
    return ['senior'];
  }

  if (/\b(mid|middle|mid\s+level|intermediate)\b/i.test(normalized)) {
    return ['mid'];
  }

  return [];
}
