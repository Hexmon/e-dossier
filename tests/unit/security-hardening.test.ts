import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('security scan enforcement', () => {
  it('uses failing security gates in package scripts', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(pkg.scripts['security:semgrep']).toContain('--error');
    expect(pkg.scripts['security:zap']).toContain('config/security/zap-baseline.conf');
    expect(pkg.scripts.security).toContain('security:audit');
    expect(pkg.scripts.security).toContain('security:secrets');
    expect(pkg.scripts.security).not.toContain('security:audit:report');
  });

  it('does not skip SAST/SCA on manual or scheduled security workflow runs', () => {
    const workflow = read('.github/workflows/security.yml');

    expect(workflow).not.toContain("github.event_name != 'schedule'");
    expect(workflow).not.toContain("github.event_name != 'workflow_dispatch'");
    expect(workflow).toContain('secrets.SNYK_TOKEN');
    expect(workflow).not.toContain('vars.SNYK_TOKEN');
    expect(workflow).toContain('Require ZAP target');
  });

  it('does not forward attacker-controlled host or arbitrary upgrade headers in nginx templates', () => {
    const templates = [
      read('deploy/airgap/templates/edossier-nginx.conf'),
      read('deploy/airgap/templates/edossier-nginx.docker.conf'),
    ];

    for (const template of templates) {
      expect(template).not.toContain('$host');
      expect(template).not.toContain('$http_host');
      expect(template).not.toContain('$http_upgrade');
      expect(template).not.toContain('Connection "upgrade"');
      expect(template).toContain('proxy_set_header Host __PUBLIC_HOST__');
      expect(template).toContain('proxy_set_header Host __MINIO_HOST__');
    }
  });

  it('keeps production and QA env examples free of reusable secrets/default passwords', () => {
    const examples = [
      read('.env.example'),
      read('.env.qa.example'),
      read('.env.production.example'),
    ].join('\n');

    expect(examples).not.toContain('BEGIN PRIVATE KEY');
    expect(examples).not.toContain('MC4CAQAw');
    expect(examples).not.toContain('ChangeMe!123');
    expect(examples).not.toContain('Admin@1234');
    expect(examples).not.toMatch(/^CSRF_SECRET=(change_me|dev_change_me|qa_change_me)$/m);
    expect(read('.env.production.example')).not.toContain('EXPOSE_TOKENS_IN_DEV=true');
  });
});

describe('cookie and CSRF production hardening', () => {
  it('sets secure auth cookies in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { setAccessCookie, clearAuthCookies } = await import('@/app/lib/cookies');

    const loginResponse = NextResponse.json({ ok: true });
    setAccessCookie(loginResponse, 'token');
    expect(loginResponse.headers.get('set-cookie')).toContain('Secure');

    const logoutResponse = NextResponse.json({ ok: true });
    clearAuthCookies(logoutResponse);
    expect(logoutResponse.headers.get('set-cookie')).toContain('Secure');
  });

  it('sets secure CSRF cookies in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CSRF_SECRET', 'strong-production-csrf-secret-for-tests');
    const { setCsrfCookie } = await import('@/lib/csrf');

    const response = NextResponse.json({ ok: true });
    setCsrfCookie(response, 'csrf-token-value');

    expect(response.headers.get('set-cookie')).toContain('Secure');
  });

  it('rejects default CSRF secrets in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CSRF_SECRET', 'change_me');
    const { generateCsrfToken } = await import('@/lib/csrf');

    await expect(generateCsrfToken()).rejects.toThrow('CSRF_SECRET must be set');
  });
});
