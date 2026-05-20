import { asc, isNull } from "drizzle-orm";

import { db } from "@/app/db/client";
import { platoons } from "@/app/db/schema/auth/platoons";
import { createPresignedGetUrl } from "@/app/lib/storage";

export type PublicPlatoonRecord = {
  id: string;
  key: string;
  name: string;
  about: string | null;
  themeColor: string;
  imageUrl: string | null;
  imageObjectKey: string | null;
};

async function withReadableImageUrl(row: PublicPlatoonRecord): Promise<PublicPlatoonRecord> {
  if (!row.imageObjectKey) return row;

  try {
    const signedUrl = await createPresignedGetUrl({
      key: row.imageObjectKey,
      expiresInSeconds: 3600,
    });
    return { ...row, imageUrl: signedUrl };
  } catch {
    return row;
  }
}

export async function listPublicPlatoonsForLanding() {
  const rows = await db
    .select({
      id: platoons.id,
      key: platoons.key,
      name: platoons.name,
      about: platoons.about,
      themeColor: platoons.themeColor,
      imageUrl: platoons.imageUrl,
      imageObjectKey: platoons.imageObjectKey,
    })
    .from(platoons)
    .where(isNull(platoons.deletedAt))
    .orderBy(asc(platoons.key));

  return Promise.all(rows.map(withReadableImageUrl));
}
