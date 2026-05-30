#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NETWORK="${NETWORK:-edossier-two-vm-sim-$$}"
SUBNET="${SUBNET:-172.30.50.0/24}"
VM1_IP="${VM1_IP:-172.30.50.10}"
VM2_IP="${VM2_IP:-172.30.50.20}"
VERIFIER_IP="${VERIFIER_IP:-172.30.50.30}"

MINIO_CONTAINER="${MINIO_CONTAINER:-edossier-sim-minio-$$}"
NGINX_CONTAINER="${NGINX_CONTAINER:-edossier-sim-vm1-$$}"

MINIO_IMAGE="${MINIO_IMAGE:-minio/minio:latest}"
NGINX_IMAGE="${NGINX_IMAGE:-nginx:1.27-alpine}"
NODE_IMAGE="${NODE_IMAGE:-node:20-bookworm-slim}"

MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-change_me_dev}"
MINIO_REGION="${MINIO_REGION:-us-east-1}"
MINIO_BUCKET="${MINIO_BUCKET:-edossier}"
PUBLIC_APP_ORIGIN="${PUBLIC_APP_ORIGIN:-http://${VM1_IP}}"
MINIO_ENDPOINT="http://${VM2_IP}:9000"
MINIO_PUBLIC_URL="${PUBLIC_APP_ORIGIN}/media"

cleanup() {
  docker rm -f "$NGINX_CONTAINER" "$MINIO_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "[sim] Creating private VM subnet ${SUBNET}"
docker network create --subnet "$SUBNET" "$NETWORK" >/dev/null

echo "[sim] Starting VM2 MinIO at ${VM2_IP}:9000"
docker run -d --rm \
  --name "$MINIO_CONTAINER" \
  --network "$NETWORK" \
  --ip "$VM2_IP" \
  -e "MINIO_ROOT_USER=${MINIO_ROOT_USER}" \
  -e "MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}" \
  -e "MINIO_REGION=${MINIO_REGION}" \
  -e "MINIO_API_CORS_ALLOW_ORIGIN=${PUBLIC_APP_ORIGIN}" \
  "$MINIO_IMAGE" server /data --console-address :9001 >/dev/null

echo "[sim] Starting VM1 nginx proxy at ${VM1_IP}:80"
docker run -d --rm \
  --name "$NGINX_CONTAINER" \
  --network "$NETWORK" \
  --ip "$VM1_IP" \
  "$NGINX_IMAGE" sh -c "cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
  listen 80 default_server;
  client_max_body_size 25m;

  location /media/ {
    proxy_http_version 1.1;
    proxy_set_header Host ${VM2_IP}:9000;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_pass http://${VM2_IP}:9000/;
  }
}
NGINX
nginx -g 'daemon off;'" >/dev/null

echo "[sim] Waiting for VM2 MinIO readiness"
for attempt in $(seq 1 30); do
  if docker run --rm --network "$NETWORK" "$NODE_IMAGE" \
    node -e "fetch('${MINIO_ENDPOINT}/minio/health/ready').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi

  if [[ "$attempt" == "30" ]]; then
    echo "[sim] MinIO did not become ready" >&2
    exit 1
  fi
  sleep 1
done

echo "[sim] Running verifier from a third IP (${VERIFIER_IP})"
docker run --rm -i \
  --network "$NETWORK" \
  --ip "$VERIFIER_IP" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  -e "MINIO_ENDPOINT=${MINIO_ENDPOINT}" \
  -e "MINIO_PUBLIC_URL=${MINIO_PUBLIC_URL}" \
  -e "MINIO_ACCESS_KEY=${MINIO_ROOT_USER}" \
  -e "MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD}" \
  -e "MINIO_BUCKET=${MINIO_BUCKET}" \
  -e "MINIO_REGION=${MINIO_REGION}" \
  -e "PUBLIC_APP_ORIGIN=${PUBLIC_APP_ORIGIN}" \
  "$NODE_IMAGE" node --input-type=module <<'NODE'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.MINIO_ENDPOINT;
const publicBaseUrl = process.env.MINIO_PUBLIC_URL;
const accessKeyId = process.env.MINIO_ACCESS_KEY;
const secretAccessKey = process.env.MINIO_SECRET_KEY;
const bucket = process.env.MINIO_BUCKET;
const region = process.env.MINIO_REGION || "us-east-1";
const origin = process.env.PUBLIC_APP_ORIGIN;
const key = `verify/two-vm-${Date.now()}.txt`;

function requireValue(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function rewriteToPublicBase(signedUrl, publicBaseUrl) {
  const signed = new URL(signedUrl);
  const publicBase = new URL(publicBaseUrl);
  publicBase.pathname = `${publicBase.pathname.replace(/\/+$/, "")}${signed.pathname}`;
  publicBase.search = signed.search;
  return publicBase.toString();
}

const client = new S3Client({
  region,
  endpoint: requireValue("MINIO_ENDPOINT", endpoint),
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: requireValue("MINIO_ACCESS_KEY", accessKeyId),
    secretAccessKey: requireValue("MINIO_SECRET_KEY", secretAccessKey),
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
}

const signedUrl = await getSignedUrl(
  client,
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "text/plain",
  }),
  { expiresIn: 60 }
);
const browserUrl = rewriteToPublicBase(signedUrl, requireValue("MINIO_PUBLIC_URL", publicBaseUrl));

const optionsResponse = await fetch(browserUrl, {
  method: "OPTIONS",
  headers: {
    Origin: requireValue("PUBLIC_APP_ORIGIN", origin),
    "Access-Control-Request-Method": "PUT",
    "Access-Control-Request-Headers": "content-type",
  },
});

const putResponse = await fetch(browserUrl, {
  method: "PUT",
  headers: { "Content-Type": "text/plain" },
  body: "two-vm-ok",
});

const result = {
  minioEndpoint: endpoint,
  publicBaseUrl,
  signedOrigin: new URL(signedUrl).origin,
  browserOrigin: new URL(browserUrl).origin,
  browserPath: new URL(browserUrl).pathname,
  corsStatus: optionsResponse.status,
  corsAllowOrigin: optionsResponse.headers.get("access-control-allow-origin"),
  putStatus: putResponse.status,
  putOk: putResponse.ok,
};

console.log(JSON.stringify(result, null, 2));

if (!optionsResponse.ok) {
  throw new Error(`CORS preflight failed with status ${optionsResponse.status}`);
}
if (result.corsAllowOrigin !== origin && result.corsAllowOrigin !== "*") {
  throw new Error(`CORS allow-origin mismatch: ${result.corsAllowOrigin}`);
}
if (!putResponse.ok) {
  const body = await putResponse.text().catch(() => "");
  throw new Error(`PUT failed with status ${putResponse.status}: ${body.slice(0, 500)}`);
}

await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
NODE

echo "[sim] Two-VM MinIO proxy upload simulation passed"
