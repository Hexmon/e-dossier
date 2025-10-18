// src\app\lib\jwt.ts
import { SignJWT, jwtVerify, importPKCS8, importSPKI, JWTPayload } from 'jose';

const ISS = 'e-dossier';
const AUD = 'e-dossier-api';
const ALG = 'EdDSA';

let _priv: CryptoKey | null = null;
let _pub: CryptoKey | null = null;

// src/app/lib/jwt.ts
function normalizePem(s?: string) {
  return (s ?? "")
    // handle one-line env with \n
    .replace(/\\n/g, "\n")
    // remove accidental quotes from env managers
    .replace(/^"+|"+$/g, "")
    .trim();
}

async function getKeys() {
  if (_priv && _pub) return { priv: _priv, pub: _pub };

  const privPem = normalizePem(process.env.ACCESS_TOKEN_PRIVATE_KEY);
  const pubPem = normalizePem(process.env.ACCESS_TOKEN_PUBLIC_KEY);

  // guard-rails with clear messages
  if (!privPem || !pubPem) {
    throw new Error("JWT keys missing. Set ACCESS_TOKEN_PRIVATE_KEY and ACCESS_TOKEN_PUBLIC_KEY.");
  }
  if (!privPem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("ACCESS_TOKEN_PRIVATE_KEY must be a PKCS#8 PEM with 'BEGIN PRIVATE KEY'.");
  }
  if (!pubPem.includes("BEGIN PUBLIC KEY")) {
    throw new Error("ACCESS_TOKEN_PUBLIC_KEY must be an SPKI PEM with 'BEGIN PUBLIC KEY'.");
  }

  try {
    _priv = await importPKCS8(privPem, ALG); // ALG = 'EdDSA'
    _pub = await importSPKI(pubPem, ALG);
  } catch (e) {
    // make the root cause obvious in logs
    console.error("Failed to import JWT keys. Check algorithm, format, and newlines.", e);
    throw e;
  }

  return { priv: _priv, pub: _pub };
}


const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900); // 15m

export type AptClaim = {
  id: string;
  position: string;                                // DB enum, e.g. 'PLATOON_COMMANDER'
  scope: { type: string; id: string | null };      // 'GLOBAL'|'PLATOON'
  valid_from: string | null;                       // ISO
  valid_to: string | null;                         // ISO
};

export async function signAccessJWT(opts: {
  sub: string;
  roles?: string[];
  apt: AptClaim;
  pwd_at?: string | null; // ISO of credentials_local.password_updated_at
}) {
  const { priv } = await getKeys();
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const payload: JWTPayload & { roles?: string[]; apt: AptClaim; pwd_at?: string | null } = {
    sub: opts.sub, iss: ISS, aud: AUD, iat: now, nbf: now,
    roles: opts.roles ?? [],
    apt: opts.apt,
    pwd_at: opts.pwd_at ?? null,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG, typ: 'JWT' })
    .setIssuer(ISS).setAudience(AUD).setSubject(opts.sub)
    .setJti(jti)
    .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + ACCESS_TTL)
    .sign(priv);
}

export async function verifyAccessJWT(token: string) {
  const { pub } = await getKeys();
  const { payload } = await jwtVerify(token, pub, { issuer: ISS, audience: AUD });
  return payload as JWTPayload & { roles?: string[]; apt?: AptClaim; pwd_at?: string | null };
}
