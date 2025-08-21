import { SignJWT, jwtVerify, importPKCS8, importSPKI, JWTPayload } from 'jose';

const ISS = 'e-dossier';
const AUD = 'e-dossier-api';
const ALG = 'EdDSA';

let _priv: CryptoKey | null = null;
let _pub: CryptoKey | null = null;

async function getKeys() {
  if (_priv && _pub) return { priv: _priv, pub: _pub };
  const privPem = process.env.ACCESS_TOKEN_PRIVATE_KEY!;
  const pubPem = process.env.ACCESS_TOKEN_PUBLIC_KEY!;
  _priv = await importPKCS8(privPem, ALG);
  _pub = await importSPKI(pubPem, ALG);
  return { priv: _priv, pub: _pub };
}

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 600);

export async function signAccessJWT(sub: string, roles: string[] = []) {
  const { priv } = await getKeys();
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload & { roles: string[] } = {
    sub, iss: ISS, aud: AUD, iat: now, nbf: now, roles,
  };
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG, typ: 'JWT' })
    .setIssuer(ISS).setAudience(AUD).setSubject(sub)
    .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + ACCESS_TTL)
    .sign(priv);
}

export async function verifyAccessJWT(token: string) {
  const { pub } = await getKeys();
  const { payload } = await jwtVerify(token, pub, { issuer: ISS, audience: AUD });
  return payload as JWTPayload & { roles?: string[] };
}
