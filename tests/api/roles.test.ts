import { describe, it, expect } from 'vitest';
import { GET as getRoles, POST as postRole } from '@/app/api/v1/roles/route';
import { makeJsonRequest } from '../utils/next';

const path = '/api/v1/roles';

describe('GET /api/v1/roles', () => {
  it('returns an empty roles array by default', async () => {
    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getRoles(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.roles.length).toBe(0);
  });
});

describe('POST /api/v1/roles', () => {
  it('echoes created role payload on happy path', async () => {
    const body = { key: 'INSTRUCTOR', description: 'Instructor role' };
    const req = makeJsonRequest({ method: 'POST', path, body });
    const res = await postRole(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.created).toEqual(body);
  });
});

