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

function requiredEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env: ${name}`);
    }
    return value;
}

function buildEndpoint(): string {
    const rawEndpoint = process.env.MINIO_ENDPOINT ?? '';
    const useSsl = (process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
    const protocol = useSsl ? 'https' : 'http';
    const port = process.env.MINIO_PORT || (useSsl ? '443' : '9000');

    if (rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')) {
        return rawEndpoint;
    }
    return `${protocol}://${rawEndpoint}:${port}`;
}

function buildPublicBaseUrl(endpoint: string) {
    const explicit = process.env.MINIO_PUBLIC_URL;
    if (explicit) return explicit.replace(/\/+$/, '');
    return endpoint.replace(/\/+$/, '');
}

export function getStorageConfig(): StorageConfig {
    for (const key of REQUIRED_ENV) requiredEnv(key);
    const endpoint = buildEndpoint();
    return {
        endpoint,
        bucket: requiredEnv('MINIO_BUCKET'),
        region: process.env.MINIO_REGION || 'us-east-1',
        accessKeyId: requiredEnv('MINIO_ACCESS_KEY'),
        secretAccessKey: requiredEnv('MINIO_SECRET_KEY'),
        publicBaseUrl: buildPublicBaseUrl(endpoint),
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

async function ensureBucketExists(client: S3Client, bucket: string) {
    if (!bucketReadyPromise) {
        bucketReadyPromise = (async () => {
            try {
                await client.send(new HeadBucketCommand({ Bucket: bucket }));
                return;
            } catch (error) {
                const code = (error as { name?: string; Code?: string })?.name ?? (error as { Code?: string })?.Code;
                const shouldCreate =
                    code === 'NotFound' ||
                    code === 'NoSuchBucket' ||
                    code === '404' ||
                    code === 'UnknownError';
                if (!shouldCreate) {
                    throw error;
                }
            }

            try {
                await client.send(new CreateBucketCommand({ Bucket: bucket }));
            } catch (createError) {
                const code = (createError as { name?: string; Code?: string })?.name ?? (createError as { Code?: string })?.Code;
                if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
                    throw createError;
                }
            }
        })().catch((error) => {
            bucketReadyPromise = null;
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

export async function createPresignedUploadUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
}) {
    const config = getStorageConfig();
    const client = createStorageClient();
    await ensureBucketExists(client, config.bucket);
    const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: params.key,
        ContentType: params.contentType,
    });
    const url = await getSignedUrl(client, command, {
        expiresIn: params.expiresInSeconds ?? 300,
    });
    return url;
}

export async function headObject(key: string) {
    const config = getStorageConfig();
    const client = createStorageClient();
    return client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
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
    const url = await getSignedUrl(client, command, {
        expiresIn: params.expiresInSeconds ?? 3600, // 1 hour default
    });
    return url;
}

export async function deleteObject(key: string) {
    const config = getStorageConfig();
    const client = createStorageClient();
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
