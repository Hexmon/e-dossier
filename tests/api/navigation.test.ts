import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/v1/me/navigation/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/app/lib/acx/principal', () => ({
    buildPrincipalFromRequest: vi.fn(),
}));

// We use the real engine logic for rules now in integration-style unit test,
// OR we keep mocking engine if we only want to test route.ts logic.
// However, since we added rules to engine.ts, we should assume the engine behaves as configured.
// But `createAuthzEngine` is mocked! We must update the mock to reflect our new policy decisions.
vi.mock('@/app/lib/acx/engine', () => ({
    createAuthzEngine: vi.fn(),
}));

import { buildPrincipalFromRequest } from '@/app/lib/acx/principal';
import { createAuthzEngine } from '@/app/lib/acx/engine';

describe('GET /api/v1/me/navigation', () => {
    const mockBuildPrincipal = buildPrincipalFromRequest as any;
    const mockCreateEngine = createAuthzEngine as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return full navigation for SUPER_ADMIN', async () => {
        mockBuildPrincipal.mockResolvedValue({
            id: 'super-admin',
            roles: ['SUPER_ADMIN'],
            permissions: [],
        });

        mockCreateEngine.mockReturnValue({
            authorize: vi.fn().mockResolvedValue({ allow: false }),
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
    });

    it('should return correct view for PLATOON CDR', async () => {
        mockBuildPrincipal.mockResolvedValue({
            id: 'pl-cdr-1',
            roles: ['PLATOON CDR'],
            permissions: [],
        });

        // Mock engine decisions for PLATOON CDR
        mockCreateEngine.mockReturnValue({
            authorize: vi.fn().mockImplementation(async ({ action }: any) => {
                const name = action?.name;
                // Platoon Cdr can access sidebar items via new policy
                if (['sidebar:academics', 'sidebar:reports', 'sidebar:dossier', 'dashboard:view'].includes(name)) {
                    return { allow: true };
                }
                return { allow: false };
            }),
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        // Admin Hidden
        expect(data.sections.find((s: any) => s.key === 'admin')).toBeUndefined();

        // Dossier Visible
        const dossierSection = data.sections.find((s: any) => s.key === 'dossier');
        expect(dossierSection).toBeDefined();

        // Academics Visible
        expect(data.sections.find((s: any) => s.key === 'academics')).toBeDefined();
    });

    it('should return correct view for ADMIN (No Dossier)', async () => {
        mockBuildPrincipal.mockResolvedValue({
            id: 'admin-1',
            roles: ['ADMIN'],
            permissions: [],
        });

        mockCreateEngine.mockReturnValue({
            authorize: vi.fn().mockImplementation(async ({ action, resource }: any) => {
                // Admin baseline allowed (handled in route.ts, but engine check might happen too)
                // Dossier has adminBaseline: false, so it hits this mock.
                if (action?.name === 'sidebar:dossier') return { allow: false };
                if (action?.name === 'dashboard:view') return { allow: true };
                // For others, if adminBaseline is true, route.ts might skip engine call!
                return { allow: true };
            }),
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        // Admin Visible (via baseline or policy)
        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();

        // Dossier Hidden (Goal!)
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeUndefined();

        // Academics Visible
        expect(data.sections.find((s: any) => s.key === 'academics')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
    });
});
