import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function abortError() {
  const err = new Error('Aborted');
  (err as Error & { name: string }).name = 'AbortError';
  return err;
}

describe('requestServerLogout', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('returns true on 204 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { requestServerLogout } = await import('@/lib/auth/logout-request');
    const ok = await requestServerLogout();

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns false on timeout', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => reject(abortError()), { once: true });
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { requestServerLogout } = await import('@/lib/auth/logout-request');
    const promise = requestServerLogout({ maxRetries: 1, requestTimeoutMs: 50 });

    await vi.advanceTimersByTimeAsync(60);

    await expect(promise).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries network errors up to configured retries', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { requestServerLogout } = await import('@/lib/auth/logout-request');
    const promise = requestServerLogout({ maxRetries: 2, baseDelayMs: 100, requestTimeoutMs: 2000 });

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retriable 4xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { requestServerLogout } = await import('@/lib/auth/logout-request');
    const ok = await requestServerLogout({ maxRetries: 3, baseDelayMs: 100 });

    expect(ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
