import { describe, expect, it, vi } from 'vitest';
import {
  loginSchema,
  registerSchema,
  passwordSchema,
} from '@/lib/validation/auth';
import {
  workspaceSchema,
  renameWorkspaceSchema,
  deleteWorkspaceSchema,
  roles,
  slugSchema,
} from '@/lib/validation/workspace';
import {
  addMemberSchema,
  changeRoleSchema,
  memberTargetSchema,
} from '@/lib/validation/member';
import { slugify, workspaceSlug } from '@/lib/slug';
import { safeNext, authRedirect } from '@/lib/auth-routing';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  can,
  assertRole,
  assertMemberChange,
  requireMember,
  requireRole,
  type Permission,
} from '@/lib/permissions';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
vi.mock('@/lib/db', () => ({
  db: { workspaceMember: { findUnique: vi.fn() } },
}));
const valid = {
  name: ' Alex ',
  email: ' ALEX@EXAMPLE.COM ',
  password: 'password123',
};
describe('auth input boundaries', () => {
  it('normalizes names and emails without trimming passwords', () => {
    expect(registerSchema.parse(valid)).toEqual({
      ...valid,
      name: 'Alex',
      email: 'alex@example.com',
    });
    expect(
      loginSchema.parse({ ...valid, password: ' password123 ' }).password,
    ).toBe(' password123 ');
  });
  it.each([
    { name: '' },
    { name: '  ' },
    { name: 'a'.repeat(81) },
    { name: 3 },
    { email: '' },
    { email: 'bad' },
    { email: 3 },
    { email: 'a'.repeat(255) + '@example.com' },
    { password: '' },
    { password: '       ' },
    { password: 'a'.repeat(7) },
    { password: 'a'.repeat(73) },
    { password: 3 },
    { password: 'é'.repeat(37) },
  ])('rejects invalid registration input %o', (override) => {
    expect(registerSchema.safeParse({ ...valid, ...override }).success).toBe(
      false,
    );
  });
  it('accepts exact limits and rejects invalid login', () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        name: 'a'.repeat(80),
        password: 'a'.repeat(72),
      }).success,
    ).toBe(true);
    expect(passwordSchema.safeParse('é'.repeat(36)).success).toBe(true);
    expect(
      loginSchema.safeParse({ email: 'x@example.com', password: '' }).success,
    ).toBe(false);
  });
});
describe('workspace and membership validation', () => {
  const slug = 'alpha';
  const memberId = 'cm123456789012345678901234';
  it('accepts exact name limits and trims', () => {
    expect(workspaceSchema.parse({ name: ' Team ' }).name).toBe('Team');
    expect(workspaceSchema.safeParse({ name: 'a'.repeat(80) }).success).toBe(
      true,
    );
  });
  it.each(['', ' ', 'a'.repeat(81), 42])(
    'rejects invalid workspace name %s',
    (name) => {
      expect(workspaceSchema.safeParse({ name }).success).toBe(false);
    },
  );
  it('rejects bad scopes, confirmations, roles and IDs', () => {
    expect(
      renameWorkspaceSchema.safeParse({ slug: '../other', name: 'Team' })
        .success,
    ).toBe(false);
    expect(
      deleteWorkspaceSchema.safeParse({ slug, confirmation: '' }).success,
    ).toBe(false);
    expect(
      deleteWorkspaceSchema.safeParse({ slug, confirmation: 'DELETE' }).success,
    ).toBe(true);
    expect(slugSchema.safeParse('a'.repeat(101)).success).toBe(false);
    expect(
      addMemberSchema.safeParse({ slug, email: 'a@example.com', role: 'ADMIN' })
        .success,
    ).toBe(true);
    expect(
      addMemberSchema.safeParse({ slug, email: 'bad', role: 'OWNER' }).success,
    ).toBe(false);
    expect(
      changeRoleSchema.safeParse({ slug, memberId, role: 'OWNER' }).success,
    ).toBe(false);
    expect(
      changeRoleSchema.safeParse({ slug, memberId, role: 'MEMBER' }).success,
    ).toBe(true);
    expect(
      memberTargetSchema.safeParse({ slug, memberId: 'bad' }).success,
    ).toBe(false);
    expect(memberTargetSchema.safeParse({ slug, memberId }).success).toBe(true);
  });
});
describe('workspace slugs', () => {
  it('creates bounded URL-safe addresses, including a fallback', () => {
    expect(slugify(' Café & Team! ')).toBe('cafe-team');
    expect(slugify('日本語')).toBe('workspace');
    expect(slugify('a'.repeat(100))).toHaveLength(80);
    expect(slugify('a'.repeat(79) + '-x')).toBe('a'.repeat(79));
    expect(workspaceSlug('Team', 0)).toBe('team');
    expect(workspaceSlug('Team', 1)).toBe('team-2');
  });
});
describe('auth routing', () => {
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/login',
    '/w/../login',
    '/w/\nfoo',
    null,
    '/%2f%2fevil.com',
    '/w/../../evil',
  ])('rejects unsafe return URL %s', (value) => {
    expect(safeNext(value)).toBe('/workspaces');
  });
  it('preserves safe path/query and redirects only protected paths', () => {
    expect(safeNext('/w/alpha/settings?tab=name')).toBe(
      '/w/alpha/settings?tab=name',
    );
    expect(safeNext('/workspaces')).toBe('/workspaces');
    expect(authRedirect('/w/anything', '?q=hello', false)).toBe(
      '/login?next=%2Fw%2Fanything%3Fq%3Dhello',
    );
    expect(authRedirect('/w', '', false)).toBe('/login?next=%2Fw');
    expect(authRedirect('/workspaces', '', false)).toBe(
      '/login?next=%2Fworkspaces',
    );
    expect(authRedirect('/login', '', true)).toBe('/workspaces');
    expect(authRedirect('/register', '', true)).toBe('/workspaces');
    expect(authRedirect('/w/alpha', '', true)).toBeNull();
    expect(authRedirect('/welcome', '', false)).toBeNull();
  });
});
describe('authentication rate limits', () => {
  it('limits each IP independently and expires windows', () => {
    const allow = createRateLimiter(2, 100);
    expect(allow('one', 0)).toBe(true);
    expect(allow('one', 1)).toBe(true);
    expect(allow('one', 2)).toBe(false);
    expect(allow('two', 2)).toBe(true);
    expect(allow('one', 100)).toBe(true);
  });
  it('bounds memory under many unique IPs', () => {
    const allow = createRateLimiter();
    for (let i = 0; i < 10_000; i++) expect(allow(String(i), 0)).toBe(true);
    expect(allow('overflow', 0)).toBe(false);
    expect(allow('overflow', 60_000)).toBe(true);
  });
});
describe('complete permission matrix', () => {
  const all: Permission[] = [
    'viewWorkspace',
    'viewBoard',
    'viewDashboard',
    'search',
    'createTask',
    'editTask',
    'moveTask',
    'deleteTask',
    'comment',
    'listMembers',
  ];
  const privileged: Permission[] = [
    'createProject',
    'renameProject',
    'reorderProject',
    'deleteProject',
    'createColumn',
    'editColumn',
    'reorderColumn',
    'deleteColumn',
    'markColumnDone',
    'addMember',
    'changeRole',
    'removeMember',
    'renameWorkspace',
  ];
  for (const role of roles) {
    it(`enforces all matrix cells for ${role}`, () => {
      for (const action of all) expect(can(role, action)).toBe(true);
      for (const action of privileged)
        expect(can(role, action)).toBe(role !== 'MEMBER');
      expect(can(role, 'deleteWorkspace')).toBe(role === 'OWNER');
      expect(can(role, 'changeOwnerRole')).toBe(false);
      expect(can(role, 'removeOwner')).toBe(false);
    });
  }
  it('rejects owner changes and the last privileged member', () => {
    expect(() => assertMemberChange('OWNER', 2, 'ADMIN')).toThrow(
      ForbiddenError,
    );
    expect(() => assertMemberChange('ADMIN', 1, 'MEMBER')).toThrow(
      ForbiddenError,
    );
    expect(() => assertMemberChange('ADMIN', 1)).toThrow(ForbiddenError);
    expect(() => assertMemberChange('ADMIN', 1, 'ADMIN')).not.toThrow();
    expect(() => assertMemberChange('ADMIN', 2, 'MEMBER')).not.toThrow();
    expect(() => assertMemberChange('MEMBER', 1)).not.toThrow();
    expect(() => assertRole('MEMBER', ['ADMIN'])).toThrow(ForbiddenError);
    expect(() => assertRole('OWNER', ['OWNER'])).not.toThrow();
  });
  it('returns not found for non-members and not allowed for existing members without a role', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.workspaceMember.findUnique).mockResolvedValueOnce(null);
    await expect(requireMember('u', 'w')).rejects.toThrow(NotFoundError);
    vi.mocked(db.workspaceMember.findUnique).mockResolvedValueOnce({
      id: 'm',
      workspaceId: 'w',
      userId: 'u',
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(requireRole('u', 'w', ['ADMIN'])).rejects.toThrow(
      ForbiddenError,
    );
  });
});
