/**
 * Removes a trailing " - {location}" segment from job titles when it duplicates
 * the structured location (e.g. "Engineer - Chicago, IL, USA").
 */
export function stripLocationFromTitle(
  title: string,
  location: string,
): string {
  let result = title.trim();
  if (!result) {
    return result;
  }

  const loc = location?.trim();
  if (loc && loc !== 'Unknown') {
    const suffix = ` - ${loc}`;
    if (result.toLowerCase().endsWith(suffix.toLowerCase())) {
      return result.slice(0, result.length - suffix.length).trimEnd();
    }
  }

  // Fallback: trailing " - City, ST" or " - City, ST, Country" (common ATS pattern)
  const trailingLocationLike =
    /\s+-\s+[^,]+,\s*[A-Z]{2}(?:\s*,\s*[A-Za-z][A-Za-z\s]*)?\s*$/i;
  if (trailingLocationLike.test(result)) {
    result = result.replace(trailingLocationLike, '').trim();
  }

  return result;
}
