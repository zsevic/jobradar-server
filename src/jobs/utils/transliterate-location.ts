import { transliterate } from 'transliteration';

const NON_LATIN_RE =
  /[\p{Script=Cyrillic}\p{Script=Georgian}\p{Script=Greek}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Devanagari}\p{Script=Thai}]/u;

export function containsNonLatinScript(value: string): boolean {
  return NON_LATIN_RE.test(value);
}

/** Title-case word boundaries (commas, spaces, dashes) without lowercasing existing capitals. */
function titleCase(value: string): string {
  return value.replace(
    /(^|[\s,\-/&])([a-z])/g,
    (_m, sep: string, ch: string) => {
      return sep + ch.toUpperCase();
    },
  );
}

/**
 * Strip phonetic punctuation left by `transliteration` (e.g. Georgian ejectives as \`, glottals as ')
 * while keeping normal English possessives like "Queen's".
 */
function cleanTransliterationArtifacts(value: string): string {
  let s = value.replace(/`/g, '');
  s = s.replace(/\u2019/g, "'");

  const protectedPossessives: string[] = [];
  s = s.replace(/\b([a-zA-Z]+)'s\b/g, (full) => {
    protectedPossessives.push(full);
    return `\x00POS${protectedPossessives.length - 1}\x00`;
  });

  let prev: string;
  do {
    prev = s;
    s = s.replace(/([a-zA-Z])'([a-zA-Z])/g, '$1$2');
  } while (s !== prev);

  s = s.replace(/POS(\d+)/g, (_, i: string) => {
    return protectedPossessives[Number(i)] ?? '';
  });

  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Returns the input unchanged when it's already Latin (incl. accented Latin).
 * Otherwise transliterates and applies title-case so e.g.
 * "თბილისის ზღვის ახალი ქალაქი" -> "Tbilisis Zgvis Axali Kalaki",
 * "Москва, Россия" -> "Moskva, Rossiya", "東京" -> "Tokyo".
 */
export function transliterateLocationDisplay(value: string): string {
  if (!value) {
    return value;
  }
  if (containsNonLatinScript(value)) {
    const ascii = transliterate(value, { trim: true });
    const cleaned = cleanTransliterationArtifacts(ascii);
    return titleCase(cleaned);
  }
  /* Rows transliterated before cleaner existed: Latin-only but still have phonetic backticks. */
  if (value.includes('`')) {
    return titleCase(cleanTransliterationArtifacts(value));
  }
  return value;
}
