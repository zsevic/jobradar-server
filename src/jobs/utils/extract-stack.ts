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
  c: ['c++', 'cpp', 'cplusplus', 'c/c++'],
  rust: ['rust', 'rustlang'],
  java: ['java', 'spring', 'spring boot'],
  '.net': ['.net', 'dotnet', 'asp.net', 'c#', 'csharp'],
  php: ['php', 'laravel', 'symfony'],
  typescript: ['typescript', 'type script', 'ts'],
  javascript: ['javascript', 'java script', 'js'],
  react: ['react', 'reactjs', 'react.js'],
  angular: ['angular', 'angularjs'],
  vue: ['vue', 'vuejs', 'vue.js'],
  'next.js': ['next.js', 'nextjs'],
  nuxt: ['nuxt', 'nuxt.js'],
  svelte: ['svelte'],
  'react native': ['react native', 'react-native'],
  swift: ['swift'],
  objc: ['objective-c', 'objective c', 'objc'],
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
  'typescript',
  'javascript',
]);
const MOBILE_STACK = new Set([
  'react native',
  'swift',
  'objc',
  'kotlin',
  'flutter',
  'dart',
]);
const BACKEND_STACK = new Set([
  'node.js',
  'python',
  'golang',
  'c',
  'rust',
  'java',
  '.net',
  'php',
]);
const BACKEND_COMPATIBLE_FRONTEND_STACK = new Set(['javascript', 'typescript']);

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
  | 'data'
  | 'solutions'
  | 'recruiter'
  | 'security'
  | 'designer'
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

/** Standalone "C" as a language token (title-focused; excludes C#, C++, cpp aliases). */
function standaloneCLanguageInText(normalized: string): boolean {
  if (/\bobjective[-\s]?c\b/i.test(normalized)) {
    return false;
  }
  if (/\bc#/i.test(normalized)) {
    return false;
  }
  if (/\bc\s*\+\+/i.test(normalized)) {
    return false;
  }
  if (/\bcpp\b|\bcplusplus\b/i.test(normalized)) {
    return false;
  }
  return /(?:^|[\s([{/,-])c(?:$|[\s)\]}",/.-])/.test(normalized);
}

function detectStackInText(
  input: string,
  options?: { standaloneGoInTitle?: boolean; standaloneCInTitle?: boolean },
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

  if (options?.standaloneCInTitle && standaloneCLanguageInText(normalized)) {
    detected.add('c');
  }

  return detected;
}

export function extractStackFromJobText(
  title: string,
  description?: string | null,
  role: JobRoleKind = 'other',
): string[] {
  const fromTitle = detectStackInText(title, {
    standaloneGoInTitle: true,
    standaloneCInTitle: true,
  });
  const fromDescription = description
    ? detectStackInText(description)
    : new Set<string>();
  const merged = new Set<string>([...fromTitle, ...fromDescription]);
  const extracted = Array.from(merged);

  if (
    role === 'devops' ||
    role === 'qa' ||
    role === 'management' ||
    role === 'ai' ||
    role === 'data' ||
    role === 'solutions' ||
    role === 'recruiter' ||
    role === 'security' ||
    role === 'designer'
  ) {
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
    return extracted.filter(
      (stack) =>
        BACKEND_STACK.has(stack) ||
        BACKEND_COMPATIBLE_FRONTEND_STACK.has(stack),
    );
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
    /\bhead\s+of\s+product\b/i.test(normalized) ||
    /\bproduct\s+management\b/i.test(normalized)
  );
}

/**
 * Delivery / program PM — before `ai` and `\bengineering\b` so e.g. "Program Manager, AI"
 * or "Engineering Program Manager" are not IC `ai` / `engineer`.
 * `\b(project|program)\s+manager\b` also matches the tail of "Technical Program Manager".
 */
function isProjectManagementTitle(normalized: string): boolean {
  return (
    /\b(?:project|program)\s+manager\b/i.test(normalized) ||
    /\bengineering\s+(?:project|program)\s+manager\b/i.test(normalized)
  );
}

/** Recruiting / talent acquisition roles. */
function mentionsRecruiterRole(normalized: string): boolean {
  return /\b(recruiter|talent\s+acquisition|sourcer|staffing)\b/i.test(
    normalized,
  );
}

/** GTM / pre-sales IC — before fullstack and before `ai` (e.g. "AI Solutions Engineer"). */
function mentionsSolutionsRole(normalized: string): boolean {
  return (
    /\b(solutions?|sales|pre[-\s]?sales|presales)\s+(engineer|architect|consultant)\b/i.test(
      normalized,
    ) ||
    /\bsolutions?\s+architect\b/i.test(normalized) ||
    /\bsolutions?\s+consultant\b/i.test(normalized) ||
    /\bgtm\s+engineer\b/i.test(normalized) ||
    /\bgo[-\s]?to[-\s]?market\s+engineer\b/i.test(normalized) ||
    /\bforward[-\s]?deployed\s+(?:[\w/&.-]+\s+)*engineer\b/i.test(normalized) ||
    /\bforward[-\s]?deployed\s+engineering\b/i.test(normalized)
  );
}

/**
 * IC + leadership designer / UX / UI titles. `Design Engineer` / `UX Engineer` stay on the
 * engineering path because they don't contain `designer` and the
 * `*\s+(manager|director|lead)` patterns below don't include `engineer`.
 * `UI Artist` / `UX Artist` (game / visual UI) are `designer`, not bare-`ui` `frontend`.
 */
function mentionsDesignerRole(normalized: string): boolean {
  return (
    /\bdesigner\b/i.test(normalized) ||
    /\b(?:ux|user\s+experience)\s+researcher\b/i.test(normalized) ||
    /\b(?:design|ux|ui|ux\/ui|ui\/ux|ux\s+ui|ui\s+ux)\s+(?:manager|director|lead)\b/i.test(
      normalized,
    ) ||
    /\b(?:head|director|vp)\s+of\s+(?:design|ux|ui|product\s+design)\b/i.test(
      normalized,
    ) ||
    /\b(?:ui|ux|ui\s*\/\s*ux|ux\s*\/\s*ui|ui\s+ux|ux\s+ui)\s+artist\b/i.test(
      normalized,
    )
  );
}

/** Security IC roles; runs after solutions so sales/security titles stay `solutions`. */
function mentionsSecurityRole(normalized: string): boolean {
  return (
    /\b(security|app(?:lication)?\s+security|appsec|product\s+security|cloud\s+security|cyber\s?security|cybersecurity|infosec|information\s+security|threat|vulnerability|soc|offensive\s+security|defensive\s+security|penetration\s+test(?:ing)?|pentest|red\s+team|blue\s+team)\b/i.test(
      normalized,
    ) &&
    /\b(engineer|engineering|developer|architect|pentester|tester)\b/i.test(
      normalized,
    )
  );
}

/**
 * IC AI / ML titles — before generic `engineer` / `engineering` matches.
 * Standalone `\bai\b` is intentionally omitted so e.g. "… - AI Fintech" or "Manager, AI"
 * are not classified as `ai` without an ML/AI-skill phrase (engineer, ML, LLM, etc.).
 */
function mentionsAiOrMlIcRole(normalized: string): boolean {
  if (
    /\b(artificial intelligence|machine learning|deep learning|neural|nlp|llm|genai|generative\s+ai|computer vision)\b/i.test(
      normalized,
    )
  ) {
    return true;
  }
  if (/\bml\b/i.test(normalized)) {
    return true;
  }
  if (
    /\bai\s+(?:engineer|engineering|developer|research\s+engineer|data\s+engineer)\b/i.test(
      normalized,
    )
  ) {
    return true;
  }
  if (/\bai\s+programmers?\b/i.test(normalized)) {
    return true;
  }
  if (/\bmachine\s+learning\s+engineer\b/i.test(normalized)) {
    return true;
  }
  if (/\bai\s*&\s*ml\s+engineer\b/i.test(normalized)) {
    return true;
  }
  if (
    /\bai\s*\/\s*ml\s+engineer\b/i.test(normalized) ||
    /\bai\/ml\s+engineer\b/i.test(normalized)
  ) {
    return true;
  }
  if (/\bai\s+agents?\b/i.test(normalized)) {
    return true;
  }
  if (
    /\b(?:senior|sr|principal|staff|lead|chief)?\s*(?:(?:data\s+scientist)|(?:applied\s+scientist)|(?:research\s+scientist))\b/i.test(
      normalized,
    )
  ) {
    return true;
  }
  return false;
}

/** Decision/marketing/business/growth-flavored *Scientist — must run before {@link mentionsAiOrMlIcRole} so "Marketing Data Scientist" stays `data` while "AI Data Engineer" stays `ai`. Excludes `product` so "Consumer Product Data Scientist" maps to `ai`. */
const ANALYTICS_FLAVOR_SCIENTIST_RE =
  /\b(decision|marketing|business|growth)\s+(?:data\s+)?scientist\b/i;

function mentionsAnalyticsFlavorScientist(normalized: string): boolean {
  return ANALYTICS_FLAVOR_SCIENTIST_RE.test(normalized);
}

/**
 * Data / analytics IC — after `ai` so e.g. "AI Data Engineer" stays `ai`.
 * Includes technical analyst titles (Data / Analytics / Insights / Reporting / BI /
 * Business Intelligence Analyst); domain analysts (business / product / marketing /
 * financial / operations / risk) intentionally excluded so they remain `other`.
 */
function mentionsDataRole(normalized: string): boolean {
  return (
    /\b(data|analytics)\s+engineer(?:ing)?\b/i.test(normalized) ||
    /\bdata\s+platform\s+engineer\b/i.test(normalized) ||
    /\betl\s+engineer\b/i.test(normalized) ||
    /\bbi\s+engineer\b/i.test(normalized) ||
    /\b(?:data|analytics|insights|reporting|bi|business\s+intelligence)\s+analyst\b/i.test(
      normalized,
    ) ||
    mentionsAnalyticsFlavorScientist(normalized)
  );
}

/** Technical architect IC roles (non pre-sales/security specializations). */
function mentionsTechnicalArchitectRole(normalized: string): boolean {
  return (
    /\b(?:systems?\s+)?software\s+architect\b/i.test(normalized) ||
    /\bsystems?\s+architect\b/i.test(normalized) ||
    /\bapplication\s+architect\b/i.test(normalized)
  );
}

/** Gameplay programming titles should count as engineering IC roles. */
function mentionsGameplayProgrammerRole(normalized: string): boolean {
  return /\bgameplay\s+programmers?\b/i.test(normalized);
}

/**
 * ATS job-board shorthand: adjacent "Python Expert", or **Expert** and **Python**
 * within the same title (bounded span). Evaluated only after stack bands (backend,
 * frontend, devops, …) so e.g. "Expert Backend — Python" stays `backend`.
 */
function mentionsPythonExpertStyleRole(normalized: string): boolean {
  if (/\bpython\s+expert\b/i.test(normalized)) {
    return true;
  }
  const withinTitle = '[^\\n]{0,160}?';
  return (
    new RegExp(`\\bexpert\\b${withinTitle}\\bpython\\b`, 'i').test(
      normalized,
    ) ||
    new RegExp(`\\bpython\\b${withinTitle}\\bexpert\\b`, 'i').test(normalized)
  );
}

/**
 * HR / People function titles. When matched without explicit IC engineering nouns
 * (`engineer` / `developer` / `architect`), classify as `other` so bare `engineering`
 * in partner org names (e.g. "Product & Engineering") does not map to `engineer`.
 */
function mentionsHrRole(normalized: string): boolean {
  return (
    /\bhrbp\b/i.test(normalized) ||
    /\bhr\s+(?:business\s+partner|generalist|specialist|coordinator|manager|director|partner|lead)\b/i.test(
      normalized,
    ) ||
    /\bhuman\s+resources\b/i.test(normalized) ||
    /\b(?:head|director|vp)\s+of\s+(?:hr|human\s+resources|people)\b/i.test(
      normalized,
    ) ||
    /\bchief\s+(?:hr|human\s+resources|people)\s+officer\b/i.test(normalized) ||
    /\bchro\b/i.test(normalized) ||
    /\bpeople\s+(?:manager|director|partner|operations|ops|business\s+partner|lead)\b/i.test(
      normalized,
    )
  );
}

export function classifyRoleFromTitle(title: string): JobRoleKind {
  const normalized = title.toLowerCase();

  if (
    mentionsHrRole(normalized) &&
    !/\b(engineer|developer|architect)\b/i.test(normalized)
  ) {
    return 'other';
  }

  if (
    /\b(engineering\s+manager|director\s+of\s+engineering|head\s+of\s+engineering|vp\s+of\s+engineering|tech(?:nical)?\s+lead|team\s+lead|staff\s+(?:engineering\s+)?manager|engineering\s+director|(?:head|director|vp)\s+of\s+solutions|(?:head|director|vp)\s+of\s+security|chief\s+information\s+security\s+officer|ciso|security\s+manager|security\s+director)\b/i.test(
      normalized,
    )
  ) {
    return 'management';
  }

  if (isProductManagementTitle(normalized)) {
    return 'management';
  }

  if (isProjectManagementTitle(normalized)) {
    return 'management';
  }

  if (mentionsRecruiterRole(normalized)) {
    return 'recruiter';
  }

  if (mentionsSolutionsRole(normalized)) {
    return 'solutions';
  }

  if (mentionsDesignerRole(normalized)) {
    return 'designer';
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
  // Desktop UI toolkit (Microsoft stack) + .NET signal => fullstack.
  // Runs before the bare `\bui\b` frontend rule so e.g. "C# WinUI Developer"
  // doesn't become `backend` via the `c# -> .net` developer fallback alone.
  if (
    /\b(?:winui|wpf|maui|xaml)\b/i.test(normalized) &&
    /(?<![a-z0-9])(?:c#|csharp|dotnet|asp\.net|\.net)(?![a-z0-9])/i.test(
      normalized,
    )
  ) {
    return 'fullstack';
  }
  if (
    (/\b(front[\s-]?end|frontend|ui)\b/i.test(normalized) ||
      /\bux\s+engineer\b/i.test(normalized) ||
      /\bux\s+developer\b/i.test(normalized) ||
      /\bdesign\s+engineer\b/i.test(normalized) ||
      /\bproduct\s+design\s+engineer\b/i.test(normalized)) &&
    !/\b(back[\s-]?end|backend)\b/i.test(normalized)
  ) {
    return 'frontend';
  }
  if (/\b(back[\s-]?end|backend|api|server[\s-]?side)\b/i.test(normalized)) {
    return 'backend';
  }
  // Bare "platform" / "infrastructure" (e.g. team or domain names) are not devops.
  if (
    /\b(devops|devsecops|sre|site reliability)\b/i.test(normalized) ||
    /\binfrastructure\s+engineer\b/i.test(normalized) ||
    // Exclude "Data Platform Engineer" (IC data), which also contains "platform engineer".
    /(?<!\bdata\s)\bplatform\s+(?:software\s+)?engineer\b/i.test(normalized) ||
    /\bcloud\s+(?:software\s+)?engineer\b/i.test(normalized)
  ) {
    return 'devops';
  }

  /**
   * "Expert … Python" when no stack band above matched (backend/frontend/devops…).
   */
  if (mentionsPythonExpertStyleRole(normalized)) {
    return 'engineer';
  }

  // Domain-specific IC roles (backend/frontend/mobile/devops) take precedence over security.
  if (mentionsSecurityRole(normalized)) {
    return 'security';
  }

  // Before AI: analytics-flavored *Scientist (see mentionsDataRole); keeps "AI Data Engineer" on `ai` below.
  if (mentionsAnalyticsFlavorScientist(normalized)) {
    return 'data';
  }

  // Before generic engineer: "AI Engineer" etc. also match /\bengineers?\b/.
  if (mentionsAiOrMlIcRole(normalized)) {
    return 'ai';
  }

  if (mentionsDataRole(normalized)) {
    return 'data';
  }

  if (mentionsGameplayProgrammerRole(normalized)) {
    return 'engineer';
  }

  if (mentionsTechnicalArchitectRole(normalized)) {
    return 'engineer';
  }

  if (
    /\bmember\s+of\s+technical\s+staff\b/i.test(normalized) ||
    /\bengineers?\b/i.test(normalized) ||
    /\bdeveloppe?r\b/i.test(normalized) ||
    /\bengineering\b/i.test(normalized)
  ) {
    return 'engineer';
  }

  const stacks = detectStackInText(normalized, {
    standaloneGoInTitle: true,
    standaloneCInTitle: true,
  });
  const hasDeveloper = /\bdevelopers?\b/i.test(normalized);
  const programmerWithStack =
    /\bprogrammers?\b/i.test(normalized) && stacks.size > 0;
  const computerProgrammer = /\bcomputer\s+programmers?\b/i.test(normalized);

  if (hasDeveloper || programmerWithStack || computerProgrammer) {
    const hasBackend = [...stacks].some((s) => BACKEND_STACK.has(s));
    const hasFrontend = [...stacks].some((s) => FRONTEND_STACK.has(s));
    const hasMobile = [...stacks].some((s) => MOBILE_STACK.has(s));
    if (hasBackend && hasFrontend) return 'fullstack';
    if (hasBackend) return 'backend';
    if (hasFrontend) return 'frontend';
    if (hasMobile) return 'mobile';
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
  if (
    mentionsHrRole(titleNorm) &&
    !/\b(engineer|developer|architect)\b/i.test(titleNorm)
  ) {
    return fromTitle;
  }
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
