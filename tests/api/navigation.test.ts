import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/v1/me/navigation/route';
import { NextRequest } from 'next/server';

vi.mock('@/app/lib/guard', () => ({
    requireAuth: vi.fn(),
}));

vi.mock('@/app/lib/module-access', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/lib/module-access')>();
    return {
        ...actual,
        resolveModuleAccessForUser: vi.fn(),
    };
});

import { requireAuth } from '@/app/lib/guard';
import { resolveModuleAccessForUser } from '@/app/lib/module-access';

describe('GET /api/v1/me/navigation', () => {
    const mockRequireAuth = requireAuth as any;
    const mockResolveModuleAccess = resolveModuleAccessForUser as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockResolvedValue({
            userId: 'user-1',
            roles: ['PLATOON CDR'],
            apt: { position: 'PLATOON CDR' },
        });
    });

    it('should return full navigation for SUPER_ADMIN', async () => {
        mockRequireAuth.mockResolvedValue({
            userId: 'super-admin',
            roles: ['SUPER_ADMIN'],
            apt: { position: 'SUPER_ADMIN' },
        });
        mockResolveModuleAccess.mockResolvedValue({
            sections: {
                dashboard: true,
                admin: true,
                settings: true,
                dossier: true,
                bulk_upload: true,
                reports: true,
                help: true,
            },
            canAccessDossier: true,
            canAccessBulkUpload: true,
            canAccessReports: true,
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'help')).toBeDefined();
    });

    it('should return correct view for OTHER roles', async () => {
        mockResolveModuleAccess.mockResolvedValue({
            sections: {
                dashboard: true,
                admin: false,
                settings: true,
                dossier: true,
                bulk_upload: true,
                reports: true,
                help: true,
            },
            canAccessDossier: true,
            canAccessBulkUpload: true,
            canAccessReports: true,
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        // Admin Hidden
        expect(data.sections.find((s: any) => s.key === 'admin')).toBeUndefined();

        // Dossier Visible
        const dossierSection = data.sections.find((s: any) => s.key === 'dossier');
        expect(dossierSection).toBeDefined();

        // Bulk upload visible
        expect(data.sections.find((s: any) => s.key === 'bulk_upload')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'academics')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'pt')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'reports')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'help')).toBeDefined();

        const settingsSection = data.sections.find((s: any) => s.key === 'settings');
        expect(settingsSection.items.some((i: any) => i.label === 'Device Site Settings')).toBe(true);
    });

    it('should return correct view for ADMIN (No Dossier/Bulk Upload/Reports)', async () => {
        mockRequireAuth.mockResolvedValue({
            userId: 'admin-1',
            roles: ['ADMIN'],
            apt: { position: 'ADMIN' },
        });
        mockResolveModuleAccess.mockResolvedValue({
            sections: {
                dashboard: true,
                admin: true,
                settings: true,
                dossier: false,
                bulk_upload: false,
                reports: false,
                help: true,
            },
            canAccessDossier: false,
            canAccessBulkUpload: false,
            canAccessReports: false,
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        // Admin Visible (via baseline or policy)
        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();

        // Dossier Hidden (Goal!)
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeUndefined();

        // Bulk upload / Reports Hidden
        expect(data.sections.find((s: any) => s.key === 'bulk_upload')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'academics')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'pt')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'reports')).toBeUndefined();
        expect(data.sections.find((s: any) => s.key === 'settings')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'help')).toBeDefined();
    });

    it('shows dossier, bulk upload, and reports for ADMIN when backend policy enables them', async () => {
        mockRequireAuth.mockResolvedValue({
            userId: 'admin-1',
            roles: ['ADMIN'],
            apt: { position: 'ADMIN' },
        });
        mockResolveModuleAccess.mockResolvedValue({
            sections: {
                dashboard: true,
                admin: true,
                settings: true,
                dossier: true,
                bulk_upload: true,
                reports: true,
                help: true,
            },
            canAccessDossier: true,
            canAccessBulkUpload: true,
            canAccessReports: true,
        });

        const req = new NextRequest('http://localhost/api/v1/me/navigation');
        const res = await GET(req);
        const data = await res.json();

        expect(data.sections.find((s: any) => s.key === 'admin')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'dossier')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'bulk_upload')).toBeDefined();
        expect(data.sections.find((s: any) => s.key === 'reports')).toBeDefined();
    });
});
