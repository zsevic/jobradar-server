const STACK_ALIASES: Record<string, string[]> = {
  'node.js': [
    'node.js',
    'nodejs',
    'node js',
    'nestjs',
    'nest.js',
    'express.js',
    'express',
  ],
  python: ['python', 'python3', 'django', 'fastapi', 'flask', 'pandas'],
  golang: ['golang', 'go lang'],
  java: ['java', 'spring', 'spring boot'],
  '.net': ['.net', 'dotnet', 'asp.net', 'c#', 'csharp'],
  php: ['php', 'laravel', 'symfony'],
  react: ['react', 'reactjs', 'react.js'],
  angular: ['angular', 'angularjs'],
  vue: ['vue', 'vuejs', 'vue.js'],
  'next.js': ['next.js', 'nextjs'],
  nuxt: ['nuxt', 'nuxt.js'],
  svelte: ['svelte'],
  'react native': ['react native', 'react-native'],
  swift: ['swift'],
  kotlin: ['kotlin'],
  flutter: ['flutter'],
  dart: ['dart'],
};

const FRONTEND_STACK = new Set([
  'react',
  'angular',
  'vue',
  'next.js',
  'nuxt',
  'svelte',
]);
const MOBILE_STACK = new Set([
  'react native',
  'swift',
  'kotlin',
  'flutter',
  'dart',
]);
const BACKEND_STACK = new Set([
  'node.js',
  'python',
  'golang',
  'java',
  '.net',
  'php',
]);

export type JobRoleKind =
  | 'frontend'
  | 'mobile'
  | 'fullstack'
  | 'backend'
  | 'devops'
  | 'qa'
  | 'management'
  | 'engineer'
  | 'ai'
  | 'other';

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/<[^>]*>/g, ' ');
}

function hasGoLanguageMention(input: string): boolean {
  return /\bgolang\b|\bgo\s+lang\b|\bgo\s+developer\b|\bgo\s+engineer\b|\bgo\s+backend\b|\bgo\s+programmer\b/i.test(
    input,
  );
}

/** Standalone "Go" as a language token (title-focused; excludes common non-tech phrases). */
function standaloneGoLanguageInText(normalized: string): boolean {
  if (/\bgo[-\s]to[-\s]market\b/i.test(normalized)) {
    return false;
  }
  if (/\bgo\s+live\b/i.test(normalized)) {
    return false;
  }
  return /(?:^|[\s([{/,-])go(?:$|[\s)\]}",/.-])/.test(normalized);
}

function detectStackInText(
  input: string,
  options?: { standaloneGoInTitle?: boolean },
): Set<string> {
  const normalized = normalizeText(input);
  const detected = new Set<string>();

  Object.entries(STACK_ALIASES).forEach(([stack, aliases]) => {
    aliases.forEach((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // `\b` fails for aliases starting/ending with non-word chars (e.g. ".net", "c#").
      // Match aliases with alphanumeric boundaries instead.
      const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
      if (regex.test(normalized)) {
        detected.add(stack);
      }
    });
  });

  if (hasGoLanguageMention(normalized)) {
    detected.add('golang');
  }

  if (options?.standaloneGoInTitle && standaloneGoLanguageInText(normalized)) {
    detected.add('golang');
  }

  return detected;
}

export function extractStackFromJobText(
  title: string,
  description?: string | null,
  role: JobRoleKind = 'other',
): string[] {
  const fromTitle = detectStackInText(title, { standaloneGoInTitle: true });
  const fromDescription = description
    ? detectStackInText(description)
    : new Set<string>();
  const merged = new Set<string>([...fromTitle, ...fromDescription]);
  const extracted = Array.from(merged);

  if (role === 'devops' || role === 'qa' || role === 'management') {
    return [];
  }

  if (role === 'frontend') {
    return extracted.filter((stack) => FRONTEND_STACK.has(stack));
  }

  if (role === 'mobile') {
    return extracted.filter((stack) => MOBILE_STACK.has(stack));
  }

  if (role === 'fullstack') {
    return extracted.filter(
      (stack) => FRONTEND_STACK.has(stack) || BACKEND_STACK.has(stack),
    );
  }

  if (role === 'backend') {
    return extracted.filter((stack) => BACKEND_STACK.has(stack));
  }

  return extracted;
}

function mentionsFullStackRole(normalized: string): boolean {
  return /\b(full[\s-]?stack|full stack|fullstack)\b/i.test(normalized);
}

/**
 * Product leadership titles — same `management` facet as eng leaders (not IC
 * engineering; avoids e.g. "… AI & Infrastructure" matching devops).
 */
function isProductManagementTitle(normalized: string): boolean {
  return (
    /\bproduct\s+(?:marketing\s+)?manager\b/i.test(normalized) ||
    /\bgroup\s+product\s+manager\b/i.test(normalized) ||
    /\btechnical\s+product\s+manager\b/i.test(normalized) ||
    /\bproduct\s+owner\b/i.test(normalized) ||
    /\bchief\s+product\s+officer\b/i.test(normalized) ||
    /\bvp\s+of\s+product\b/i.test(normalized) ||
    /\bhead\s+of\s+product\b/i.test(normalized)
  );
}

export function classifyRoleFromTitle(title: string): JobRoleKind {
  const normalized = title.toLowerCase();

  if (
    /\b(engineering\s+manager|director\s+of\s+engineering|head\s+of\s+engineering|vp\s+of\s+engineering|tech(?:nical)?\s+lead|team\s+lead|staff\s+(?:engineering\s+)?manager|engineering\s+director)\b/i.test(
      normalized,
    )
  ) {
    return 'management';
  }

  if (isProductManagementTitle(normalized)) {
    return 'management';
  }

  if (mentionsFullStackRole(normalized)) {
    return 'fullstack';
  }
  if (
    /\b(mobile|ios|android|react native|flutter|swift|kotlin)\b/i.test(
      normalized,
    )
  ) {
    return 'mobile';
  }
  // Before UI/frontend: titles like "UI QA Automation Engineer" must not match `\bui\b` alone.
  if (
    /\b(qa|quality assurance|test automation|tester|test engineer|sdet|software development engineer in test)\b/i.test(
      normalized,
    )
  ) {
    return 'qa';
  }
  if (
    /\b(front[\s-]?end|frontend|ui)\b/i.test(normalized) &&
    !/\b(back[\s-]?end|backend)\b/i.test(normalized)
  ) {
    return 'frontend';
  }
  if (/\b(back[\s-]?end|backend|api|server[\s-]?side)\b/i.test(normalized)) {
    return 'backend';
  }
  if (
    /\b(devops|sre|platform engineer|site reliability|cloud\s+infrastructure|infrastructure\s+engineer)\b/i.test(
      normalized,
    )
  ) {
    return 'devops';
  }

  // Before generic engineer: "AI Engineer" etc. also match /\bengineers?\b/.
  if (
    /\b(ai|artificial intelligence|machine learning|deep learning|neural|nlp|llm|genai|generative\s+ai|computer vision)\b/i.test(
      normalized,
    ) ||
    /\bml\b/i.test(normalized)
  ) {
    return 'ai';
  }

  if (
    /\bmember\s+of\s+technical\s+staff\b/i.test(normalized) ||
    /\bengineers?\b/i.test(normalized) ||
    /\bengineering\b/i.test(normalized)
  ) {
    return 'engineer';
  }

  return 'other';
}

/**
 * When the title yields {@link JobRoleKind} `other`, optionally re-check plain-text
 * description (e.g. Ashby `descriptionPlain`) for full-stack wording — only if the
 * title already suggests an engineering role (`engineer` / `engineers` / `engineering`).
 */
export function classifyRoleWithDescriptionFallback(
  title: string,
  description?: string | null,
): JobRoleKind {
  const fromTitle = classifyRoleFromTitle(title);
  if (fromTitle !== 'other' || !description?.trim()) {
    return fromTitle;
  }
  const titleNorm = title.toLowerCase();
  const titleLooksEngineering =
    /\bengineers?\b/i.test(titleNorm) || /\bengineering\b/i.test(titleNorm);
  if (!titleLooksEngineering) {
    return fromTitle;
  }
  if (mentionsFullStackRole(normalizeText(description))) {
    return 'fullstack';
  }
  return fromTitle;
}
