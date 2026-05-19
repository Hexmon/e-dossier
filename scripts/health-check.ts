#!/usr/bin/env tsx
/**
 * Service Health Check Script
 * Checks if PostgreSQL and MinIO are accessible
 */
import 'dotenv/config';
import { Client } from 'pg';
import { normalizeDatabaseUrl } from '../src/app/db/connectionString';
import {
    checkStorageReadiness,
    checkStorageCors,
    createPresignedUploadUrl,
    normalizeStorageEndpoint,
} from '../src/app/lib/storage';

function maskConnectionString(value: string) {
    return value.replace(/:[^:@]+@/, ':****@');
}

function resolveMinioBaseUrl() {
    const endpoint = process.env.MINIO_ENDPOINT || '';
    if (!endpoint) return null;
    return normalizeStorageEndpoint({
        endpoint,
        useSsl: process.env.MINIO_USE_SSL,
        port: process.env.MINIO_PORT,
    });
}

async function checkPostgres() {
    console.log('🔍 Checking PostgreSQL connection...');

    const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL) || '';
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set');
        return false;
    }

    try {
        const client = new Client({ connectionString });
        await client.connect();
        const result = await client.query('SELECT version()');
        console.log('✅ PostgreSQL is accessible');
        console.log(`   Version: ${String(result.rows[0]?.version || '').split(',')[0]}`);
        await client.end();
        return true;
    } catch (error: any) {
        console.error('❌ PostgreSQL connection failed');
        console.error(`   Error: ${error.message}`);
        console.error(`   Connection string: ${maskConnectionString(connectionString)}`);
        return false;
    }
}

async function checkMinIO() {
    console.log('\n🔍 Checking MinIO/S3 storage...');

    let baseUrl: string | null;
    try {
        baseUrl = resolveMinioBaseUrl();
    } catch (error: any) {
        console.error('❌ Storage endpoint configuration is invalid');
        console.error(`   Error: ${error.message}`);
        return false;
    }

    if (!baseUrl) {
        console.error('❌ MINIO_ENDPOINT is not set');
        return false;
    }

    try {
        const url = `${baseUrl}/minio/health/ready`;
        const response = await fetch(url);
        if (response.ok) {
            console.log('✅ MinIO health endpoint is ready');
            console.log(`   Endpoint: ${baseUrl}`);
        } else {
            console.warn('⚠️  MinIO health endpoint did not report ready');
            console.warn(`   Status: ${response.status}`);
            console.warn('   Continuing with S3 bucket/credential checks.');
        }
    } catch (error: any) {
        console.warn('⚠️  MinIO health endpoint could not be reached');
        console.warn(`   Error: ${error.message}`);
        console.warn(`   Endpoint: ${baseUrl}`);
        console.warn('   Continuing with S3 bucket/credential checks.');
    }

    try {
        const readiness = await checkStorageReadiness();
        console.log('✅ Storage bucket is reachable with configured credentials');
        console.log(`   Endpoint: ${readiness.endpoint}`);
        console.log(`   Bucket: ${readiness.bucket}`);

        const cors = await checkStorageCors();
        console.log('✅ Storage CORS preflight works for browser uploads');
        console.log(`   Origin: ${cors.origin}`);
        console.log(`   Allow-Origin: ${cors.allowOrigin}`);

        await createPresignedUploadUrl({
            key: `health-check/presign-${Date.now()}.txt`,
            contentType: 'text/plain',
            expiresInSeconds: 60,
        });
        console.log('✅ Presigned PUT URL generation works');
        return true;
    } catch (error: any) {
        console.error('❌ Storage check failed');
        console.error(`   Error: ${error.message}`);
        console.error(`   Endpoint: ${baseUrl}`);
        if (process.env.MINIO_BUCKET) {
            console.error(`   Bucket: ${process.env.MINIO_BUCKET}`);
        }
        console.error('   Check that app MINIO_ACCESS_KEY/MINIO_SECRET_KEY match the storage root/user credentials.');
        return false;
    }
}

async function main() {
    const storageOnly = process.argv.includes('--storage-only');

    console.log('🚀 Service Health Check\n');
    console.log('='.repeat(50));

    const postgresOk = storageOnly ? true : await checkPostgres();
    const minioOk = await checkMinIO();

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Summary:');
    if (!storageOnly) {
        console.log(`   PostgreSQL: ${postgresOk ? '✅ OK' : '❌ FAILED'}`);
    }
    console.log(`   MinIO:      ${minioOk ? '✅ OK' : '❌ FAILED'}`);

    if (!postgresOk || !minioOk) {
        console.log('\n⚠️  Some services are not available.');
        console.log('\n💡 To start services with Docker:');
        console.log('   docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d');
        process.exit(1);
    }

    console.log('\n✅ All services are healthy!');
    process.exit(0);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
