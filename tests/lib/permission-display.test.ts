import { describe, expect, it } from 'vitest';
import { getPermissionDisplayMeta } from '@/app/lib/rbac/permission-display';

describe('permission display metadata', () => {
  it('maps admin:appointments:create to user-friendly title', () => {
    const meta = getPermissionDisplayMeta('admin:appointments:create');
    expect(meta.title).toBe('Can create appointments');
    expect(meta.moduleLabel).toBe('Appointments');
    expect(meta.areaLabel).toBe('Admin');
    expect(meta.actionLabel).toBe('Create');
    expect(meta.isFallback).toBe(false);
  });

  it('maps nested rbac key to clear output', () => {
    const meta = getPermissionDisplayMeta('admin:rbac:permissions:read');
    expect(meta.title).toBe('Can view permission settings');
    expect(meta.moduleLabel).toBe('Permission Settings');
    expect(meta.areaLabel).toBe('Admin');
    expect(meta.actionLabel).toBe('View');
  });

  it('keeps unknown keys readable via fallback', () => {
    const meta = getPermissionDisplayMeta('custom:my-feature:approve');
    expect(meta.title).toBe('Can manage my feature');
    expect(meta.isFallback).toBe(true);
  });

  it('prefers existing DB description when provided', () => {
    const meta = getPermissionDisplayMeta('admin:courses:read', 'Can review course records.');
    expect(meta.description).toBe('Can review course records.');
  });

  it('handles verb mapping for read/update/delete/upload/download', () => {
    expect(getPermissionDisplayMeta('admin:courses:read').title).toBe('Can view courses');
    expect(getPermissionDisplayMeta('admin:courses:update').title).toBe('Can edit courses');
    expect(getPermissionDisplayMeta('admin:courses:delete').title).toBe('Can delete courses');
    expect(getPermissionDisplayMeta('admin:courses:upload').title).toBe('Can upload courses');
    expect(getPermissionDisplayMeta('admin:courses:download').title).toBe('Can download courses');
  });
});
