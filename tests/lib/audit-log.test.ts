/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/db/client', () => {
  const insert = vi.fn(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));
  return { db: { insert } };
});

import { db } from '@/app/db/client';
import {
  computeDiff,
  redactSensitiveData,
  createAuditLog,
} from '@/lib/audit-log';

const insertMock = db.insert as unknown as vi.Mock;

describe('audit-log utilities', () => {
  beforeEach(() => {
    insertMock.mockImplementation(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('computes diffs for added, removed, and changed fields', () => {
    const { diff, changedFields } = computeDiff(
      { name: 'Alice', email: 'alice@example.com', phone: '123' },
      { name: 'Alicia', phone: '456', extra: 'value' }
    );
    expect(changedFields).toEqual(expect.arrayContaining(['name', 'phone', 'email', 'extra']));
    expect(diff?.changed?.name).toEqual({ before: 'Alice', after: 'Alicia' });
    expect(diff?.removed?.email).toBe('alice@example.com');
    expect(diff?.added?.extra).toBe('value');
  });

  it('redacts sensitive fields recursively', () => {
    const result = redactSensitiveData({
      password: 'secret',
      nested: { token: 'abc', email: 'user@example.com', phone: '+1234567890' },
    });
    expect(result.password).toBe('***REDACTED***');
    expect(result.nested?.token).toBe('***REDACTED***');
    expect(result.nested?.email).toMatch(/^\w\*\*\*@/);
    expect(result.nested?.phone).toMatch(/\*{8}\d{2}$/);
  });

  it('writes audit log rows with request context metadata', async () => {
    const request = new Request('https://app.local/api/test?foo=bar', {
      method: 'POST',
      headers: { 'x-request-id': 'req-123', 'user-agent': 'vitest', 'x-forwarded-for': '1.1.1.1' },
    });
    await createAuditLog({
      actorUserId: 'user-1',
      eventType: 'USER.UPDATE',
      resourceType: 'user',
      resourceId: 'user-99',
      description: 'Updated profile',
      metadata: { email: 'alice@example.com' },
      before: { phone: '123' },
      after: { phone: '456' },
      request,
    });
    expect(insertMock).toHaveBeenCalled();
    const inserted = insertMock.mock.results[0].value;
    expect(inserted.values).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'user-1',
      method: 'POST',
      path: '/api/test',
      requestId: 'req-123',
      diff: expect.any(Object),
    }));
  });

  it('swallows failures for non-required events', async () => {
    insertMock.mockImplementation(() => ({
      values: vi.fn(() => { throw new Error('db down'); }),
    }));
    await expect(createAuditLog({
      actorUserId: 'user-1',
      eventType: 'TEST.EVENT',
      resourceType: 'user',
    })).resolves.toBeUndefined();
  });

  it('throws when required audit log fails', async () => {
    insertMock.mockImplementation(() => ({
      values: vi.fn(() => { throw new Error('db down'); }),
    }));
    await expect(createAuditLog({
      actorUserId: 'user-1',
      eventType: 'TEST.EVENT',
      resourceType: 'user',
      required: true,
    })).rejects.toThrow('db down');
  });
});
