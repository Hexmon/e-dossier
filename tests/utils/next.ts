export interface MockJsonRequestOptions {
  method?: string;
  path: string;
  baseURL?: string;
  headers?: Record<string, string>;
  body?: unknown;
  cookies?: Record<string, string>;
}

export function createRouteContext<TParams = Record<string, string>>(
  params?: TParams
): { params: Promise<TParams> } {
  return {
    params: Promise.resolve(params ?? ({} as TParams)),
  };
}

/**
 * Create a minimal object that looks enough like NextRequest for our route handlers.
 * This avoids booting a full Next server for API tests.
 */
export function makeJsonRequest(opts: MockJsonRequestOptions): any {
  const url = new URL(opts.path, opts.baseURL ?? 'http://localhost:3000');

  const headers = new Headers({
    'content-type': 'application/json',
    ...(opts.headers ?? {}),
  });

  const cookies = opts.cookies ?? {};

  const cookieHeader = Object.keys(cookies).length
    ? Object.entries(cookies)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('; ')
    : undefined;

  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  const cookieStore = {
    get(name: string) {
      const value = cookies[name];
      return value ? { name, value } : undefined;
    },
  };

  return {
    method: (opts.method ?? 'GET').toUpperCase(),
    url: url.toString(),
    nextUrl: url,
    headers,
    cookies: cookieStore,
    async json() {
      return opts.body;
    },
  } as any;
}

