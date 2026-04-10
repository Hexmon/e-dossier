#!/usr/bin/env tsx
/**
 * Service Health Check Script
 * Checks if PostgreSQL and MinIO are accessible
 */
import 'dotenv/config';
import { Client } from 'pg';
import { normalizeDatabaseUrl } from '../src/app/db/connectionString';

function maskConnectionString(value: string) {
    return value.replace(/:[^:@]+@/, ':****@');
}

function resolveMinioBaseUrl() {
    const endpoint = process.env.MINIO_ENDPOINT || '';
    if (!endpoint) return null;

    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint.replace(/\/+$/, '');
    }

    const useSsl = (process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
    const protocol = useSsl ? 'https' : 'http';
    const port = process.env.MINIO_PORT || (useSsl ? '443' : '9000');
    return `${protocol}://${endpoint}:${port}`;
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
    console.log('\n🔍 Checking MinIO connection...');

    const baseUrl = resolveMinioBaseUrl();
    if (!baseUrl) {
        console.error('❌ MINIO_ENDPOINT is not set');
        return false;
    }

    try {
        const url = `${baseUrl}/minio/health/ready`;
        const response = await fetch(url);
        if (response.ok) {
            console.log('✅ MinIO is accessible');
            console.log(`   Endpoint: ${baseUrl}`);
            return true;
        }

        console.error('❌ MinIO health check failed');
        console.error(`   Status: ${response.status}`);
        return false;
    } catch (error: any) {
        console.error('❌ MinIO connection failed');
        console.error(`   Error: ${error.message}`);
        console.error(`   Endpoint: ${baseUrl}`);
        return false;
    }
}

async function main() {
    console.log('🚀 Service Health Check\n');
    console.log('='.repeat(50));

    const postgresOk = await checkPostgres();
    const minioOk = await checkMinIO();

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   PostgreSQL: ${postgresOk ? '✅ OK' : '❌ FAILED'}`);
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
