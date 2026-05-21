import { titleMatchesRoleTitleKeyword } from './match-role-title-keyword';

describe('titleMatchesRoleTitleKeyword', () => {
  it('does not match ml inside IMLC (physician title)', () => {
    const title =
      'Weekends | Primary Care Physician (FM) | Nationwide (IMLC) | Remote';
    expect(titleMatchesRoleTitleKeyword(title, 'ml')).toBe(false);
  });

  it('matches standalone ML token', () => {
    expect(titleMatchesRoleTitleKeyword('Senior ML Engineer', 'ml')).toBe(true);
    expect(titleMatchesRoleTitleKeyword('AI/ML Platform Engineer', 'ml')).toBe(
      true,
    );
  });

  it('matches multi-word phrases via substring', () => {
    expect(
      titleMatchesRoleTitleKeyword(
        'Staff Machine Learning Engineer',
        'machine learning',
      ),
    ).toBe(true);
  });

  it('matches short llm/nlp tokens at word boundaries only', () => {
    expect(
      titleMatchesRoleTitleKeyword('LLM Infrastructure Engineer', 'llm'),
    ).toBe(true);
    expect(titleMatchesRoleTitleKeyword('Enrollment', 'llm')).toBe(false);
  });
});
