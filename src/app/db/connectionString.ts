function normalizeSslMode(url: URL) {
    const sslmode = url.searchParams.get('sslmode');
    const useLibpqCompat = url.searchParams.get('uselibpqcompat');

    if (!sslmode || useLibpqCompat === 'true') {
        return;
    }

    if (sslmode === 'prefer' || sslmode === 'require' || sslmode === 'verify-ca') {
        url.searchParams.set('sslmode', 'verify-full');
    }
}

export function normalizeDatabaseUrl(connectionString: string | undefined | null) {
    const trimmed = connectionString?.trim();
    if (!trimmed) {
        return trimmed ?? '';
    }

    try {
        const url = new URL(trimmed);
        normalizeSslMode(url);
        return url.toString();
    } catch {
        return trimmed;
    }
}
