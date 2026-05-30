import { randomUUID } from 'crypto';
import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REQUIRED_ENV = [
    'MINIO_ENDPOINT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET',
];

type StorageConfig = {
    endpoint: string;
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl: string;
};

export const STORAGE_UNAVAILABLE_MESSAGE =
    'File storage is unavailable. Check MinIO/storage configuration.';

export class StorageConfigError extends Error {
    readonly service = 'storage';
    readonly retryable = true;
    readonly storageCode = 'storage_config_error';
    readonly diagnostics?: Record<string, unknown>;

    constructor(message = 'File storage is not configured. Check MinIO/storage environment variables.', diagnostics?: Record<string, unknown>) {
        super(message);
        this.name = 'StorageConfigError';
        this.diagnostics = diagnostics;
    }
}

export class StorageUnavailableError extends Error {
    readonly service = 'storage';
    readonly retryable = true;
    readonly storageCode = 'storage_unavailable';
    readonly diagnostics?: Record<string, unknown>;

    constructor(message = STORAGE_UNAVAILABLE_MESSAGE, opts: { cause?: unknown; diagnostics?: Record<string, unknown> } = {}) {
        super(message);
        this.name = 'StorageUnavailableError';
        this.diagnostics = opts.diagnostics;
        if (opts.cause !== undefined) {
            (this as Error & { cause?: unknown }).cause = opts.cause;
        }
    }
}

function requiredEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new StorageConfigError(undefined, { missingEnv: name });
    }
    return value;
}

export function normalizeStorageEndpoint(input: {
    endpoint: string;
    useSsl?: string | boolean;
    port?: string;
}): string {
    const rawEndpoint = input.endpoint.trim().replace(/\/+$/, '');
    if (!rawEndpoint) {
        throw new StorageConfigError(undefined, { missingEnv: 'MINIO_ENDPOINT' });
    }

    if (rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')) {
        try {
            return new URL(rawEndpoint).toString().replace(/\/+$/, '');
        } catch {
            throw new StorageConfigError('File storage endpoint is invalid. Check MINIO_ENDPOINT.', {
                invalidEnv: 'MINIO_ENDPOINT',
            });
        }
    }

    const useSsl = String(input.useSsl ?? 'false').toLowerCase() === 'true';
    const protocol = useSsl ? 'https' : 'http';
    const port = input.port || (useSsl ? '443' : '9000');
    if (rawEndpoint.includes('/')) {
        throw new StorageConfigError(
            'File storage endpoint is invalid. Use a full http(s) URL when MINIO_ENDPOINT includes a proxy path.',
            { invalidEnv: 'MINIO_ENDPOINT' }
        );
    }
    const hasPort = /:\d+$/.test(rawEndpoint);

    try {
        return new URL(`${protocol}://${rawEndpoint}${hasPort ? '' : `:${port}`}`).toString().replace(/\/+$/, '');
    } catch {
        throw new StorageConfigError('File storage endpoint is invalid. Check MINIO_ENDPOINT.', {
            invalidEnv: 'MINIO_ENDPOINT',
        });
    }
}

export function normalizeStoragePublicBaseUrl(endpoint: string, publicUrl?: string) {
    const explicit = publicUrl?.trim();
    const rawBaseUrl = explicit || endpoint;
    const normalized = rawBaseUrl.replace(/\/+$/, '');

    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new StorageConfigError('File storage public URL is invalid. Check MINIO_PUBLIC_URL.', {
            invalidEnv: explicit ? 'MINIO_PUBLIC_URL' : 'MINIO_ENDPOINT',
        });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new StorageConfigError('File storage public URL is invalid. Use an http(s) URL.', {
            invalidEnv: explicit ? 'MINIO_PUBLIC_URL' : 'MINIO_ENDPOINT',
        });
    }

    if (parsed.search || parsed.hash) {
        throw new StorageConfigError('File storage public URL must not include query strings or fragments.', {
            invalidEnv: explicit ? 'MINIO_PUBLIC_URL' : 'MINIO_ENDPOINT',
        });
    }

    if (parsed.pathname.split('/').some((segment) => /:\d+$/.test(segment))) {
        throw new StorageConfigError(
            'File storage public URL is invalid. Put the port after the host, not inside the /media path. Use http://<VM1-IP>:3000/media for the app media proxy, http://<VM1-IP>/media for an nginx proxy, or http://<VM2-IP>:9000 for direct MinIO access.',
            { invalidEnv: 'MINIO_PUBLIC_URL' }
        );
    }

    return normalized;
}

function normalizedPathname(pathname: string) {
    const normalized = pathname.replace(/\/+$/, '');
    return normalized === '' ? '/' : normalized;
}

function joinUrlPath(basePath: string, childPath: string) {
    const base = normalizedPathname(basePath);
    const child = childPath.replace(/^\/+/, '');
    if (!child) return base;
    if (base === '/') return `/${child}`;
    return `${base}/${child}`;
}

export function rewriteStorageUrlToPublicBase(
    signedUrl: string,
    config: Pick<StorageConfig, 'endpoint' | 'publicBaseUrl'>
) {
    const endpointUrl = new URL(config.endpoint);
    const publicBaseUrl = new URL(config.publicBaseUrl);
    if (
        endpointUrl.origin === publicBaseUrl.origin &&
        normalizedPathname(endpointUrl.pathname) === normalizedPathname(publicBaseUrl.pathname)
    ) {
        return signedUrl;
    }

    const url = new URL(signedUrl);
    const endpointPath = normalizedPathname(endpointUrl.pathname);
    let objectPath = url.pathname;
    if (endpointPath !== '/' && objectPath.startsWith(`${endpointPath}/`)) {
        objectPath = objectPath.slice(endpointPath.length);
    }

    publicBaseUrl.pathname = joinUrlPath(publicBaseUrl.pathname, objectPath);
    publicBaseUrl.search = url.search;
    publicBaseUrl.hash = url.hash;
    return publicBaseUrl.toString();
}

export function getStorageConfig(): StorageConfig {
    for (const key of REQUIRED_ENV) requiredEnv(key);
    const endpoint = normalizeStorageEndpoint({
        endpoint: requiredEnv('MINIO_ENDPOINT'),
        useSsl: process.env.MINIO_USE_SSL,
        port: process.env.MINIO_PORT,
    });
    return {
        endpoint,
        bucket: requiredEnv('MINIO_BUCKET'),
        region: process.env.MINIO_REGION || 'us-east-1',
        accessKeyId: requiredEnv('MINIO_ACCESS_KEY'),
        secretAccessKey: requiredEnv('MINIO_SECRET_KEY'),
        publicBaseUrl: normalizeStoragePublicBaseUrl(endpoint, process.env.MINIO_PUBLIC_URL),
    };
}

export function createStorageClient() {
    const config = getStorageConfig();
    return new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: true,
        // Avoid signing optional checksum headers into presigned PUT URLs.
        // MinIO/browser uploads can fail when SDK injects a fixed checksum
        // query value (e.g. x-amz-checksum-crc32=AAAAAA==) for unknown payloads.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

let bucketReadyPromise: Promise<void> | null = null;
let bucketReadyKey: string | null = null;

function getErrorChain(error: unknown): Array<Record<string, unknown>> {
    const chain: Array<Record<string, unknown>> = [];
    const visited = new Set<unknown>();
    let current = error;

    while (current && typeof current === 'object' && !visited.has(current)) {
        visited.add(current);
        chain.push(current as Record<string, unknown>);
        current = (current as { cause?: unknown }).cause;
    }

    return chain;
}

function getStorageErrorCode(error: unknown): string | null {
    for (const item of getErrorChain(error)) {
        for (const key of ['name', 'Code', 'code', 'errno']) {
            const value = item[key];
            if (typeof value === 'string' && value.trim()) return value;
        }
    }
    return null;
}

function getStorageHttpStatus(error: unknown): number | null {
    for (const item of getErrorChain(error)) {
        const metadata = item.$metadata;
        if (metadata && typeof metadata === 'object') {
            const status = (metadata as { httpStatusCode?: unknown }).httpStatusCode;
            if (typeof status === 'number') return status;
        }
        const statusCode = item.statusCode ?? item.status;
        if (typeof statusCode === 'number') return statusCode;
    }
    return null;
}

const NETWORK_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'TimeoutError',
    'NetworkingError',
]);

const AUTH_ERROR_CODES = new Set([
    'AccessDenied',
    'InvalidAccessKeyId',
    'InvalidSecretAccessKey',
    'SignatureDoesNotMatch',
    'AuthorizationHeaderMalformed',
    'CredentialsProviderError',
]);

function isMissingBucketError(error: unknown): boolean {
    const code = getStorageErrorCode(error);
    const status = getStorageHttpStatus(error);
    return code === 'NotFound' || code === 'NoSuchBucket' || code === 'NoSuchKey' || status === 404;
}

function safeStorageDiagnostics(error: unknown, config: Pick<StorageConfig, 'endpoint' | 'bucket'>, operation: string) {
    return {
        operation,
        endpoint: config.endpoint,
        bucket: config.bucket,
        code: getStorageErrorCode(error),
        httpStatusCode: getStorageHttpStatus(error),
    };
}

function toStorageError(
    error: unknown,
    config: Pick<StorageConfig, 'endpoint' | 'bucket'>,
    operation: string
): StorageUnavailableError {
    if (error instanceof StorageUnavailableError) return error;

    const code = getStorageErrorCode(error);
    const status = getStorageHttpStatus(error);
    const diagnostics = safeStorageDiagnostics(error, config, operation);

    if (code && AUTH_ERROR_CODES.has(code)) {
        return new StorageUnavailableError('File storage credentials are invalid. Check MinIO/S3 access key and secret key.', {
            cause: error,
            diagnostics,
        });
    }

    if (code && NETWORK_ERROR_CODES.has(code)) {
        return new StorageUnavailableError(STORAGE_UNAVAILABLE_MESSAGE, { cause: error, diagnostics });
    }

    if (status === 403) {
        return new StorageUnavailableError('File storage rejected the request. Check bucket permissions and credentials.', {
            cause: error,
            diagnostics,
        });
    }

    return new StorageUnavailableError(STORAGE_UNAVAILABLE_MESSAGE, { cause: error, diagnostics });
}

async function ensureBucketExists(client: S3Client, config: StorageConfig) {
    const cacheKey = `${config.endpoint}|${config.bucket}|${config.accessKeyId}`;
    if (!bucketReadyPromise || bucketReadyKey !== cacheKey) {
        bucketReadyKey = cacheKey;
        bucketReadyPromise = (async () => {
            try {
                await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
                return;
            } catch (error) {
                if (!isMissingBucketError(error)) {
                    throw toStorageError(error, config, 'head_bucket');
                }
            }

            try {
                await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
            } catch (createError) {
                const code = (createError as { name?: string; Code?: string })?.name ?? (createError as { Code?: string })?.Code;
                if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
                    throw toStorageError(createError, config, 'create_bucket');
                }
            }
        })().catch((error) => {
            bucketReadyPromise = null;
            bucketReadyKey = null;
            throw error;
        });
    }

    await bucketReadyPromise;
}

const EXT_BY_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export function buildImageKey(opts: { ocId: string; kind: string; contentType: string }) {
    const ext = EXT_BY_TYPE[opts.contentType] || 'bin';
    const token = randomUUID();
    return `oc/${opts.ocId}/${opts.kind.toLowerCase()}/${token}.${ext}`;
}

export function getPublicObjectUrl(objectKey: string) {
    const config = getStorageConfig();
    return `${config.publicBaseUrl}/${config.bucket}/${objectKey}`;
}

export function getObjectKeyFromPublicUrl(publicUrl: string): string | null {
    const config = getStorageConfig();
    let parsed: URL;
    try {
        parsed = new URL(publicUrl);
    } catch {
        return null;
    }

    const path = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    const bucketPrefix = `${config.bucket}/`;
    const bucketIndex = path.indexOf(bucketPrefix);
    if (bucketIndex >= 0) {
        const key = path.slice(bucketIndex + bucketPrefix.length);
        return key || null;
    }

    const relegationIndex = path.toLowerCase().indexOf('relegation/');
    if (relegationIndex >= 0) {
        const key = path.slice(relegationIndex);
        return key || null;
    }

    return null;
}

export async function createPresignedUploadUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
}) {
    const config = getStorageConfig();
    const client = createStorageClient();
    try {
        await ensureBucketExists(client, config);
        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: params.key,
            ContentType: params.contentType,
        });
        const signedUrl = await getSignedUrl(client, command, {
            expiresIn: params.expiresInSeconds ?? 300,
        });
        return rewriteStorageUrlToPublicBase(signedUrl, config);
    } catch (error) {
        throw toStorageError(error, config, 'presign_put_object');
    }
}

export async function headObject(key: string) {
    const config = getStorageConfig();
    const client = createStorageClient();
    try {
        return await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    } catch (error) {
        throw toStorageError(error, config, 'head_object');
    }
}

export async function createPresignedGetUrl(params: {
    key: string;
    expiresInSeconds?: number;
}) {
    const config = getStorageConfig();
    const client = createStorageClient();
    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: params.key,
    });
    try {
        const signedUrl = await getSignedUrl(client, command, {
            expiresIn: params.expiresInSeconds ?? 3600, // 1 hour default
        });
        return rewriteStorageUrlToPublicBase(signedUrl, config);
    } catch (error) {
        throw toStorageError(error, config, 'presign_get_object');
    }
}

export async function getObjectBytes(key: string) {
    const config = getStorageConfig();
    const client = createStorageClient();
    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
    });
    try {
        const result = await client.send(command);
        const body = result.Body;
        if (!body || typeof body.transformToByteArray !== 'function') {
            throw new StorageUnavailableError(STORAGE_UNAVAILABLE_MESSAGE, {
                diagnostics: { operation: 'get_object', key },
            });
        }

        return {
            bytes: await body.transformToByteArray(),
            contentType: result.ContentType,
            contentLength: result.ContentLength,
        };
    } catch (error) {
        if (error instanceof StorageUnavailableError) {
            throw error;
        }
        throw toStorageError(error, config, 'get_object');
    }
}

export async function putObjectBytes(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
}) {
    const config = getStorageConfig();
    const client = createStorageClient();
    try {
        await ensureBucketExists(client, config);
        await client.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
        }));
    } catch (error) {
        throw toStorageError(error, config, 'put_object');
    }
}

export async function deleteObject(key: string) {
    const config = getStorageConfig();
    const client = createStorageClient();
    try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    } catch (error) {
        throw toStorageError(error, config, 'delete_object');
    }
}

export async function checkStorageReadiness() {
    const config = getStorageConfig();
    const client = createStorageClient();
    try {
        await ensureBucketExists(client, config);
        return {
            ok: true,
            endpoint: config.endpoint,
            bucket: config.bucket,
        };
    } catch (error) {
        throw toStorageError(error, config, 'storage_check_head_bucket');
    }
}

export async function checkStorageCors() {
    const config = getStorageConfig();
    const origin = process.env.STORAGE_CORS_CHECK_ORIGIN?.trim() || 'http://localhost:3000';
    const uploadUrl = await createPresignedUploadUrl({
        key: `health-check/cors-${Date.now()}.txt`,
        contentType: 'text/plain',
        expiresInSeconds: 60,
    });

    try {
        const response = await fetch(uploadUrl, {
            method: 'OPTIONS',
            headers: {
                Origin: origin,
                'Access-Control-Request-Method': 'PUT',
                'Access-Control-Request-Headers': 'content-type',
            },
        });
        const allowOrigin = response.headers.get('access-control-allow-origin');
        const originAllowed = allowOrigin === '*' || allowOrigin === origin;

        if (!response.ok || !originAllowed) {
            throw new StorageUnavailableError(
                'File storage CORS is not configured. Configure bucket CORS for browser uploads.',
                {
                    diagnostics: {
                        operation: 'storage_check_browser_cors',
                        endpoint: config.endpoint,
                        bucket: config.bucket,
                        origin,
                        httpStatusCode: response.status,
                        allowOrigin,
                    },
                }
            );
        }

        return {
            ok: true,
            endpoint: config.endpoint,
            bucket: config.bucket,
            origin,
            allowOrigin,
        };
    } catch (error) {
        throw toStorageError(error, config, 'storage_check_browser_cors');
    }
}
