import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/v1/me/navigation/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/app/lib/acx/principal', () => ({
    buildPrincipalFromRequest: vi.fn(),
}));

import { buildPrincipalFromRequest } from '@/app/lib/acx/principal';

describe('GET /api/v1/me/navigation', () => {
    const mockBuildPrincipal = buildPrincipalFromRequest as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return full navigation for SUPER_ADMIN', async () => {
        mockBuildPrincipal.mockResolvedValue({
            id: 'super-admin',
            roles: ['SUPER_ADMIN'],
            permissions: [],
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
    });

    it('should return correct view for OTHER roles', async () => {
        mockBuildPrincipal.mockResolvedValue({
            id: 'pl-cdr-1',
            roles: ['PLATOON CDR'],
            permissions: [],
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
        expect(data.sections.find((s: any) => s.key === 'reports')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();

        const settingsSection = data.sections.find((s: any) => s.key === 'settings');
        expect(settingsSection.items.some((i: any) => i.label === 'Device Site Settings')).toBe(true);
    });

    it('should return correct view for ADMIN (No Dossier/Academics/Reports)', async () => {
        mockBuildPrincipal.mockResolvedValue({
            id: 'admin-1',
            roles: ['ADMIN'],
            permissions: [],
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        // Admin Visible (via baseline or policy)
        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();

        // Dossier Hidden (Goal!)
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeUndefined();

        // Academics / Reports Hidden
        expect(data.sections.find((s: any) => s.key === 'academics')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'reports')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
    });
});
