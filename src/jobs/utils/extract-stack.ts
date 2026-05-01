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

  if (role === 'devops' || role === 'qa') {
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

export function classifyRoleFromTitle(title: string): JobRoleKind {
  const normalized = title.toLowerCase();

  if (/\b(full[\s-]?stack|full stack|fullstack)\b/i.test(normalized)) {
    return 'fullstack';
  }
  if (
    /\b(mobile|ios|android|react native|flutter|swift|kotlin)\b/i.test(
      normalized,
    )
  ) {
    return 'mobile';
  }
  if (
    /\b(front[\s-]?end|frontend|ui|web)\b/i.test(normalized) &&
    !/\b(back[\s-]?end|backend)\b/i.test(normalized)
  ) {
    return 'frontend';
  }
  if (/\b(back[\s-]?end|backend|api|server[\s-]?side)\b/i.test(normalized)) {
    return 'backend';
  }
  if (/\b(devops|sre|platform engineer|site reliability)\b/i.test(normalized)) {
    return 'devops';
  }
  if (
    /\b(qa|quality assurance|test automation|tester|test engineer|sdet|software development engineer in test)\b/i.test(
      normalized,
    )
  ) {
    return 'qa';
  }

  return 'other';
}
