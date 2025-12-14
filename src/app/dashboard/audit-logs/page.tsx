import { cookies, headers } from 'next/headers';
import Link from 'next/link';

type SearchParams = Record<string, string | string[] | undefined>;

async function fetchAuditLogs(searchParams: SearchParams) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.set(key, value);
    }
  });
  if (!params.has('limit')) params.set('limit', '50');
  const headersList = await headers();
  const protocol = headersList.get('x-forwarded-proto') ?? 'http';
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const origin = host ? `${protocol}://${host}` : '';
  const cookieHeader = cookies().toString();
  const res = await fetch(`${origin}/api/v1/admin/audit-logs?${params.toString()}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load audit logs: ${res.status}`);
  }
  return res.json();
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearch = (await searchParams) ?? {};
  const data = await fetchAuditLogs(resolvedSearch);
  const filters = {
    actorUserId: (resolvedSearch?.actorUserId as string) ?? '',
    resourceType: (resolvedSearch?.resourceType as string) ?? '',
    requestId: (resolvedSearch?.requestId as string) ?? '',
    eventType: (resolvedSearch?.eventType as string) ?? '',
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-gray-500">Search by actor, event, or request ID.</p>
        </div>
        <Link
          href="/dashboard/audit-logs"
          className="text-sm text-blue-600 hover:underline"
        >
          Clear filters
        </Link>
      </div>

      <form className="grid gap-4 md:grid-cols-4" method="get">
        <label className="flex flex-col text-sm">
          Actor User ID
          <input
            type="text"
            name="actorUserId"
            defaultValue={filters.actorUserId}
            className="rounded border px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col text-sm">
          Event Type
          <input
            type="text"
            name="eventType"
            defaultValue={filters.eventType}
            className="rounded border px-2 py-1 text-sm"
            placeholder="AUTH.LOGIN_SUCCESS"
          />
        </label>
        <label className="flex flex-col text-sm">
          Resource Type
          <input
            type="text"
            name="resourceType"
            defaultValue={filters.resourceType}
            className="rounded border px-2 py-1 text-sm"
            placeholder="user"
          />
        </label>
        <label className="flex flex-col text-sm">
          Request ID
          <input
            type="text"
            name="requestId"
            defaultValue={filters.requestId}
            className="rounded border px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          className="mt-6 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Apply Filters
        </button>
      </form>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Timestamp</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Event</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Actor</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Resource</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Request</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.items.map((row: any) => (
              <tr key={row.id}>
                <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">{row.eventType}</div>
                  <div className="text-gray-500">{row.description}</div>
                </td>
                <td className="px-3 py-2">
                  {row.actorUserId ?? 'system'}
                </td>
                <td className="px-3 py-2">
                  {row.resourceType}
                  {row.resourceId ? `:${row.resourceId}` : ''}
                </td>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">
                    {row.method} {row.path}
                  </div>
                  <div className="text-gray-500 text-xs">
                    requestId: {row.requestId ?? 'n/a'}
                  </div>
                </td>
              </tr>
            ))}
            {!data.items.length && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                  No audit entries found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
