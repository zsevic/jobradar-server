import { classifyRoleFromTitle } from './extract-stack';

describe('classifyRoleFromTitle', () => {
  it('classifies software architect as engineer', () => {
    expect(classifyRoleFromTitle('Software Architect')).toBe('engineer');
  });

  it('classifies lead systems software architect as engineer', () => {
    expect(classifyRoleFromTitle('Lead Systems Software Architect')).toBe(
      'engineer',
    );
  });

  it('classifies senior system architect as engineer', () => {
    expect(classifyRoleFromTitle('Senior System Architect')).toBe('engineer');
  });

  it('classifies systems architect as engineer', () => {
    expect(classifyRoleFromTitle('Systems Architect')).toBe('engineer');
  });

  it('classifies senior gameplay programmer as engineer', () => {
    expect(classifyRoleFromTitle('Senior Gameplay Programmer')).toBe(
      'engineer',
    );
  });

  it('classifies ai programmer as ai', () => {
    expect(classifyRoleFromTitle('AI Programmer')).toBe('ai');
  });

  it('classifies c/c++ developper title as engineer', () => {
    expect(classifyRoleFromTitle('C/C++ Developper - Oracle Databases')).toBe(
      'engineer',
    );
  });

  it('keeps solutions architect under solutions role', () => {
    expect(classifyRoleFromTitle('Solutions Architect')).toBe('solutions');
  });
});
