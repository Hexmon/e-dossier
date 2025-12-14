import { NextRequest } from 'next/server';
import { ApiError } from '@/app/lib/http';
import { ensureRequestContext, logApiRequest } from '@/lib/audit-log';

type HandlerContext = { params?: any } | Record<string, unknown> | undefined;
type RouteHandler<TContext extends HandlerContext = HandlerContext> = (
  req: NextRequest,
  context: TContext
) => Promise<Response> | Response;

function inferOutcome(status: number) {
  if (status >= 500) return 'ERROR';
  if (status >= 400) return 'FAILURE';
  return 'SUCCESS';
}

export function withRouteLogging<TContext extends HandlerContext = HandlerContext>(
  _method: string,
  handler: RouteHandler<TContext>
) {
  return async function route(request: NextRequest, context: TContext): Promise<Response> {
    const ctx = ensureRequestContext(request);
    const requestIdHeader = request.headers.get('x-request-id');

    try {
      const response = await handler(request, context);
      const status = response.status ?? 200;
      logApiRequest({
        request,
        finalize: true,
        statusCode: status,
        outcome: inferOutcome(status),
      });
      if (requestIdHeader && !response.headers.get('x-request-id')) {
        response.headers.set('x-request-id', requestIdHeader);
      } else if (ctx?.requestId && !response.headers.get('x-request-id')) {
        response.headers.set('x-request-id', ctx.requestId);
      }
      return response;
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      logApiRequest({
        request,
        finalize: true,
        statusCode: status,
        outcome: status >= 500 ? 'ERROR' : 'FAILURE',
      });
      throw error;
    }
  };
}
