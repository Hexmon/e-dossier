import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/app/db/client";
import {
  siteAwards,
  siteCommanders,
  siteEventsNews,
  siteFooter,
  siteHistory,
  siteSettings,
} from "@/app/db/schema/auth/siteSettings";
import type {
  AwardCreateInput,
  AwardUpdateInput,
  CommanderCreateInput,
  CommanderUpdateInput,
  EventNewsCreateInput,
  EventNewsTypeInput,
  EventNewsUpdateInput,
  FooterCreateInput,
  FooterUpdateInput,
  HistoryCreateInput,
  HistoryUpdateInput,
  SiteSettingsUpdateInput,
} from "@/app/lib/validators.site-settings";

const DEFAULT_SINGLETON_KEY = "default" as const;

const SITE_SETTINGS_SELECT = {
  id: siteSettings.id,
  singletonKey: siteSettings.singletonKey,
  logoUrl: siteSettings.logoUrl,
  logoObjectKey: siteSettings.logoObjectKey,
  heroBgUrl: siteSettings.heroBgUrl,
  heroBgObjectKey: siteSettings.heroBgObjectKey,
  heroTitle: siteSettings.heroTitle,
  heroDescription: siteSettings.heroDescription,
  commandersSectionTitle: siteSettings.commandersSectionTitle,
  awardsSectionTitle: siteSettings.awardsSectionTitle,
  historySectionTitle: siteSettings.historySectionTitle,
  updatedBy: siteSettings.updatedBy,
  createdAt: siteSettings.createdAt,
  updatedAt: siteSettings.updatedAt,
} as const;

const COMMANDER_SELECT = {
  id: siteCommanders.id,
  name: siteCommanders.name,
  designation: siteCommanders.designation,
  imageUrl: siteCommanders.imageUrl,
  imageObjectKey: siteCommanders.imageObjectKey,
  tenure: siteCommanders.tenure,
  description: siteCommanders.description,
  sortOrder: siteCommanders.sortOrder,
  isDeleted: siteCommanders.isDeleted,
  deletedAt: siteCommanders.deletedAt,
  createdAt: siteCommanders.createdAt,
  updatedAt: siteCommanders.updatedAt,
} as const;

const AWARD_SELECT = {
  id: siteAwards.id,
  title: siteAwards.title,
  description: siteAwards.description,
  imageUrl: siteAwards.imageUrl,
  imageObjectKey: siteAwards.imageObjectKey,
  category: siteAwards.category,
  sortOrder: siteAwards.sortOrder,
  isDeleted: siteAwards.isDeleted,
  deletedAt: siteAwards.deletedAt,
  createdAt: siteAwards.createdAt,
  updatedAt: siteAwards.updatedAt,
} as const;

const HISTORY_SELECT = {
  id: siteHistory.id,
  incidentDate: siteHistory.incidentDate,
  description: siteHistory.description,
  isDeleted: siteHistory.isDeleted,
  deletedAt: siteHistory.deletedAt,
  createdAt: siteHistory.createdAt,
  updatedAt: siteHistory.updatedAt,
} as const;

const EVENTS_NEWS_SELECT = {
  id: siteEventsNews.id,
  date: siteEventsNews.date,
  title: siteEventsNews.title,
  description: siteEventsNews.description,
  location: siteEventsNews.location,
  type: siteEventsNews.type,
  isDeleted: siteEventsNews.isDeleted,
  deletedAt: siteEventsNews.deletedAt,
  createdAt: siteEventsNews.createdAt,
  updatedAt: siteEventsNews.updatedAt,
} as const;

const FOOTER_SELECT = {
  footer: siteFooter.footer,
} as const;

export type SiteSettingsRecord = typeof siteSettings.$inferSelect;
export type SiteCommanderRecord = typeof siteCommanders.$inferSelect;
export type SiteAwardRecord = typeof siteAwards.$inferSelect;
export type SiteHistoryRecord = typeof siteHistory.$inferSelect;
export type SiteEventNewsRecord = typeof siteEventsNews.$inferSelect;
export type SiteFooterRecord = typeof siteFooter.$inferSelect;

export const DEFAULT_PUBLIC_SITE_SETTINGS = {
  logoUrl: null,
  heroBgUrl: null,
  heroTitle: "MCEME",
  heroDescription:
    "Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering",
  commandersSectionTitle: "Commander's Corner",
  awardsSectionTitle: "Gallantry Awards",
  historySectionTitle: "Our History",
} as const;

function now() {
  return new Date();
}

export async function getOrCreateSiteSettings() {
  const [existing] = await db
    .select(SITE_SETTINGS_SELECT)
    .from(siteSettings)
    .where(eq(siteSettings.singletonKey, DEFAULT_SINGLETON_KEY))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(siteSettings)
    .values({ singletonKey: DEFAULT_SINGLETON_KEY })
    .returning(SITE_SETTINGS_SELECT);

  return created;
}

export async function getSiteSettingsOrDefault() {
  const [existing] = await db
    .select(SITE_SETTINGS_SELECT)
    .from(siteSettings)
    .where(eq(siteSettings.singletonKey, DEFAULT_SINGLETON_KEY))
    .limit(1);

  if (existing) return existing;

  return {
    id: "",
    singletonKey: DEFAULT_SINGLETON_KEY,
    logoUrl: DEFAULT_PUBLIC_SITE_SETTINGS.logoUrl,
    logoObjectKey: null,
    heroBgUrl: DEFAULT_PUBLIC_SITE_SETTINGS.heroBgUrl,
    heroBgObjectKey: null,
    heroTitle: DEFAULT_PUBLIC_SITE_SETTINGS.heroTitle,
    heroDescription: DEFAULT_PUBLIC_SITE_SETTINGS.heroDescription,
    commandersSectionTitle: DEFAULT_PUBLIC_SITE_SETTINGS.commandersSectionTitle,
    awardsSectionTitle: DEFAULT_PUBLIC_SITE_SETTINGS.awardsSectionTitle,
    historySectionTitle: DEFAULT_PUBLIC_SITE_SETTINGS.historySectionTitle,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function updateSiteSettings(input: SiteSettingsUpdateInput, actorUserId: string) {
  const current = await getOrCreateSiteSettings();

  const [updated] = await db
    .update(siteSettings)
    .set({
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
      logoObjectKey:
        input.logoObjectKey !== undefined ? input.logoObjectKey : current.logoObjectKey,
      heroBgUrl: input.heroBgUrl !== undefined ? input.heroBgUrl : current.heroBgUrl,
      heroBgObjectKey:
        input.heroBgObjectKey !== undefined ? input.heroBgObjectKey : current.heroBgObjectKey,
      heroTitle: input.heroTitle ?? current.heroTitle,
      heroDescription: input.heroDescription ?? current.heroDescription,
      commandersSectionTitle: input.commandersSectionTitle ?? current.commandersSectionTitle,
      awardsSectionTitle: input.awardsSectionTitle ?? current.awardsSectionTitle,
      historySectionTitle: input.historySectionTitle ?? current.historySectionTitle,
      updatedBy: actorUserId,
      updatedAt: now(),
    })
    .where(eq(siteSettings.id, current.id))
    .returning(SITE_SETTINGS_SELECT);

  return {
    before: current,
    after: updated,
  };
}

export async function clearSiteLogo(actorUserId: string) {
  const current = await getOrCreateSiteSettings();

  const [updated] = await db
    .update(siteSettings)
    .set({
      logoUrl: null,
      logoObjectKey: null,
      updatedBy: actorUserId,
      updatedAt: now(),
    })
    .where(eq(siteSettings.id, current.id))
    .returning(SITE_SETTINGS_SELECT);

  return {
    before: current,
    after: updated,
  };
}

export async function clearSiteHeroBg(actorUserId: string) {
  const current = await getOrCreateSiteSettings();

  const [updated] = await db
    .update(siteSettings)
    .set({
      heroBgUrl: null,
      heroBgObjectKey: null,
      updatedBy: actorUserId,
      updatedAt: now(),
    })
    .where(eq(siteSettings.id, current.id))
    .returning(SITE_SETTINGS_SELECT);

  return {
    before: current,
    after: updated,
  };
}

async function getNextSortOrderForCommanders() {
  const [row] = await db
    .select({
      next: sql<number>`coalesce(max(${siteCommanders.sortOrder}), 0) + 1`,
    })
    .from(siteCommanders)
    .where(eq(siteCommanders.isDeleted, false));

  return row?.next ?? 1;
}

async function getNextSortOrderForAwards() {
  const [row] = await db
    .select({
      next: sql<number>`coalesce(max(${siteAwards.sortOrder}), 0) + 1`,
    })
    .from(siteAwards)
    .where(eq(siteAwards.isDeleted, false));

  return row?.next ?? 1;
}

export async function listSiteCommanders(options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const where = includeDeleted ? undefined : eq(siteCommanders.isDeleted, false);

  return db
    .select(COMMANDER_SELECT)
    .from(siteCommanders)
    .where(where)
    .orderBy(asc(siteCommanders.sortOrder), asc(siteCommanders.createdAt));
}

export async function getSiteCommanderById(id: string, options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const where = includeDeleted
    ? eq(siteCommanders.id, id)
    : and(eq(siteCommanders.id, id), eq(siteCommanders.isDeleted, false));

  const [row] = await db
    .select(COMMANDER_SELECT)
    .from(siteCommanders)
    .where(where)
    .limit(1);

  return row ?? null;
}

export async function createSiteCommander(input: CommanderCreateInput) {
  const sortOrder = input.sortOrder ?? (await getNextSortOrderForCommanders());
  const [created] = await db
    .insert(siteCommanders)
    .values({
      name: input.name,
      designation: input.designation,
      tenure: input.tenure,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      imageObjectKey: input.imageObjectKey ?? null,
      sortOrder,
      updatedAt: now(),
    })
    .returning(COMMANDER_SELECT);

  return created;
}

export async function updateSiteCommander(id: string, input: CommanderUpdateInput) {
  const existing = await getSiteCommanderById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteCommanders)
    .set({
      name: input.name ?? existing.name,
      designation: input.designation ?? existing.designation,
      tenure: input.tenure ?? existing.tenure,
      description: input.description ?? existing.description,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
      imageObjectKey:
        input.imageObjectKey !== undefined ? input.imageObjectKey : existing.imageObjectKey,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: now(),
    })
    .where(eq(siteCommanders.id, id))
    .returning(COMMANDER_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function softDeleteSiteCommander(id: string) {
  const existing = await getSiteCommanderById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteCommanders)
    .set({
      isDeleted: true,
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(eq(siteCommanders.id, id))
    .returning(COMMANDER_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function hardDeleteSiteCommander(id: string) {
  const existing = await getSiteCommanderById(id, { includeDeleted: true });
  if (!existing) return null;

  const [deleted] = await db
    .delete(siteCommanders)
    .where(eq(siteCommanders.id, id))
    .returning(COMMANDER_SELECT);

  return {
    before: existing,
    after: deleted,
  };
}

export async function listSiteAwards(options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const where = includeDeleted ? undefined : eq(siteAwards.isDeleted, false);

  return db
    .select(AWARD_SELECT)
    .from(siteAwards)
    .where(where)
    .orderBy(asc(siteAwards.sortOrder), asc(siteAwards.createdAt));
}

export async function getSiteAwardById(id: string, options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const where = includeDeleted
    ? eq(siteAwards.id, id)
    : and(eq(siteAwards.id, id), eq(siteAwards.isDeleted, false));

  const [row] = await db.select(AWARD_SELECT).from(siteAwards).where(where).limit(1);
  return row ?? null;
}

export async function createSiteAward(input: AwardCreateInput) {
  const sortOrder = input.sortOrder ?? (await getNextSortOrderForAwards());

  const [created] = await db
    .insert(siteAwards)
    .values({
      title: input.title,
      description: input.description,
      category: input.category,
      imageUrl: input.imageUrl ?? null,
      imageObjectKey: input.imageObjectKey ?? null,
      sortOrder,
      updatedAt: now(),
    })
    .returning(AWARD_SELECT);

  return created;
}

export async function updateSiteAward(id: string, input: AwardUpdateInput) {
  const existing = await getSiteAwardById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteAwards)
    .set({
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
      imageObjectKey:
        input.imageObjectKey !== undefined ? input.imageObjectKey : existing.imageObjectKey,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: now(),
    })
    .where(eq(siteAwards.id, id))
    .returning(AWARD_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function softDeleteSiteAward(id: string) {
  const existing = await getSiteAwardById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteAwards)
    .set({
      isDeleted: true,
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(eq(siteAwards.id, id))
    .returning(AWARD_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function hardDeleteSiteAward(id: string) {
  const existing = await getSiteAwardById(id, { includeDeleted: true });
  if (!existing) return null;

  const [deleted] = await db.delete(siteAwards).where(eq(siteAwards.id, id)).returning(AWARD_SELECT);

  return {
    before: existing,
    after: deleted,
  };
}

export async function reorderSiteAwards(orderedIds: string[]) {
  return db.transaction(async (tx) => {
    const current = await tx
      .select({ id: siteAwards.id })
      .from(siteAwards)
      .where(eq(siteAwards.isDeleted, false));

    const currentIds = current.map((row) => row.id);
    if (currentIds.length !== orderedIds.length) {
      return { ok: false as const, reason: "length_mismatch" as const };
    }

    const currentSet = new Set(currentIds);
    for (const id of orderedIds) {
      if (!currentSet.has(id)) {
        return { ok: false as const, reason: "unknown_id" as const };
      }
    }

    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx
        .update(siteAwards)
        .set({
          sortOrder: index + 1,
          updatedAt: now(),
        })
        .where(eq(siteAwards.id, orderedIds[index]));
    }

    const updated = await tx
      .select(AWARD_SELECT)
      .from(siteAwards)
      .where(eq(siteAwards.isDeleted, false))
      .orderBy(asc(siteAwards.sortOrder), asc(siteAwards.createdAt));

    return {
      ok: true as const,
      items: updated,
    };
  });
}

export async function listSiteHistory(options?: { includeDeleted?: boolean; sort?: "asc" | "desc" }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const sort = options?.sort ?? "asc";
  const where = includeDeleted ? undefined : eq(siteHistory.isDeleted, false);
  const order = sort === "asc" ? asc(siteHistory.incidentDate) : desc(siteHistory.incidentDate);

  return db.select(HISTORY_SELECT).from(siteHistory).where(where).orderBy(order);
}

export async function getSiteHistoryById(id: string, options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const where = includeDeleted
    ? eq(siteHistory.id, id)
    : and(eq(siteHistory.id, id), eq(siteHistory.isDeleted, false));

  const [row] = await db.select(HISTORY_SELECT).from(siteHistory).where(where).limit(1);
  return row ?? null;
}

export async function createSiteHistory(input: HistoryCreateInput) {
  const [created] = await db
    .insert(siteHistory)
    .values({
      incidentDate: input.incidentDate,
      description: input.description,
      updatedAt: now(),
    })
    .returning(HISTORY_SELECT);

  return created;
}

export async function updateSiteHistory(id: string, input: HistoryUpdateInput) {
  const existing = await getSiteHistoryById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteHistory)
    .set({
      incidentDate: input.incidentDate ?? existing.incidentDate,
      description: input.description ?? existing.description,
      updatedAt: now(),
    })
    .where(eq(siteHistory.id, id))
    .returning(HISTORY_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function softDeleteSiteHistory(id: string) {
  const existing = await getSiteHistoryById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteHistory)
    .set({
      isDeleted: true,
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(eq(siteHistory.id, id))
    .returning(HISTORY_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function hardDeleteSiteHistory(id: string) {
  const existing = await getSiteHistoryById(id, { includeDeleted: true });
  if (!existing) return null;

  const [deleted] = await db
    .delete(siteHistory)
    .where(eq(siteHistory.id, id))
    .returning(HISTORY_SELECT);

  return {
    before: existing,
    after: deleted,
  };
}

export async function listSiteEventsNews(options?: {
  includeDeleted?: boolean;
  sort?: "asc" | "desc";
  type?: EventNewsTypeInput;
}) {
  const includeDeleted = options?.includeDeleted ?? false;
  const sort = options?.sort ?? "desc";
  const predicates = [];

  if (!includeDeleted) {
    predicates.push(eq(siteEventsNews.isDeleted, false));
  }
  if (options?.type) {
    predicates.push(eq(siteEventsNews.type, options.type));
  }

  const where = predicates.length === 0 ? undefined : predicates.length === 1 ? predicates[0] : and(...predicates);
  const dateOrder = sort === "asc" ? asc(siteEventsNews.date) : desc(siteEventsNews.date);
  const createdAtOrder = sort === "asc" ? asc(siteEventsNews.createdAt) : desc(siteEventsNews.createdAt);

  return db
    .select(EVENTS_NEWS_SELECT)
    .from(siteEventsNews)
    .where(where)
    .orderBy(dateOrder, createdAtOrder);
}

export async function getSiteEventNewsById(id: string, options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;
  const where = includeDeleted
    ? eq(siteEventsNews.id, id)
    : and(eq(siteEventsNews.id, id), eq(siteEventsNews.isDeleted, false));

  const [row] = await db.select(EVENTS_NEWS_SELECT).from(siteEventsNews).where(where).limit(1);
  return row ?? null;
}

export async function createSiteEventNews(input: EventNewsCreateInput) {
  const [created] = await db
    .insert(siteEventsNews)
    .values({
      date: input.date,
      title: input.title,
      description: input.description,
      location: input.location,
      type: input.type,
      updatedAt: now(),
    })
    .returning(EVENTS_NEWS_SELECT);

  return created;
}

export async function updateSiteEventNews(id: string, input: EventNewsUpdateInput) {
  const existing = await getSiteEventNewsById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteEventsNews)
    .set({
      date: input.date ?? existing.date,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      location: input.location ?? existing.location,
      type: input.type ?? existing.type,
      updatedAt: now(),
    })
    .where(eq(siteEventsNews.id, id))
    .returning(EVENTS_NEWS_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function softDeleteSiteEventNews(id: string) {
  const existing = await getSiteEventNewsById(id, { includeDeleted: true });
  if (!existing) return null;

  const [updated] = await db
    .update(siteEventsNews)
    .set({
      isDeleted: true,
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(eq(siteEventsNews.id, id))
    .returning(EVENTS_NEWS_SELECT);

  return {
    before: existing,
    after: updated,
  };
}

export async function hardDeleteSiteEventNews(id: string) {
  const existing = await getSiteEventNewsById(id, { includeDeleted: true });
  if (!existing) return null;

  const [deleted] = await db
    .delete(siteEventsNews)
    .where(eq(siteEventsNews.id, id))
    .returning(EVENTS_NEWS_SELECT);

  return {
    before: existing,
    after: deleted,
  };
}

export async function getSiteFooter() {
  const [row] = await db.select(FOOTER_SELECT).from(siteFooter).limit(1);
  return row ?? null;
}

export async function createSiteFooter(input: FooterCreateInput) {
  const existing = await getSiteFooter();
  if (existing) {
    return null;
  }

  const [created] = await db
    .insert(siteFooter)
    .values({
      footer: input.footer,
    })
    .returning(FOOTER_SELECT);

  return created;
}

export async function updateSiteFooter(input: FooterUpdateInput) {
  const existing = await getSiteFooter();
  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(siteFooter)
    .set({
      footer: input.footer,
    })
    .returning(FOOTER_SELECT);

  if (!updated) {
    return null;
  }

  return {
    before: existing,
    after: updated,
  };
}

export async function listPublicCommanders() {
  return db
    .select(COMMANDER_SELECT)
    .from(siteCommanders)
    .where(eq(siteCommanders.isDeleted, false))
    .orderBy(asc(siteCommanders.sortOrder), asc(siteCommanders.createdAt));
}

export async function listPublicAwards() {
  return db
    .select(AWARD_SELECT)
    .from(siteAwards)
    .where(eq(siteAwards.isDeleted, false))
    .orderBy(asc(siteAwards.sortOrder), asc(siteAwards.createdAt));
}

export async function listPublicHistory(sort: "asc" | "desc" = "asc") {
  return listSiteHistory({ includeDeleted: false, sort });
}

export async function listPublicEventsNews(
  sort: "asc" | "desc" = "desc",
  type?: EventNewsTypeInput
) {
  return listSiteEventsNews({ includeDeleted: false, sort, type });
}

export async function getPublicFooter() {
  return getSiteFooter();
}
