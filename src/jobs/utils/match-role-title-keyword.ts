/** Short single-token legacy keywords must not match substrings (e.g. `ml` in `IMLC`). */
export function roleTitleKeywordNeedsWordBoundary(keyword: string): boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed || trimmed.includes(' ')) {
    return false;
  }
  return trimmed.length <= 4;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Postgres `~*` pattern: token bounded by non-alphanumeric (or string start/end). */
export function roleTitleKeywordRegexPattern(keyword: string): string {
  const escaped = escapeRegexLiteral(keyword.trim().toLowerCase());
  return `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`;
}

export function titleMatchesRoleTitleKeyword(
  title: string,
  keyword: string,
): boolean {
  const normalized = title.toLowerCase();
  const trimmedKeyword = keyword.trim().toLowerCase();
  if (!trimmedKeyword) {
    return false;
  }
  if (roleTitleKeywordNeedsWordBoundary(keyword)) {
    return new RegExp(roleTitleKeywordRegexPattern(keyword), 'i').test(
      normalized,
    );
  }
  return normalized.includes(trimmedKeyword);
}
