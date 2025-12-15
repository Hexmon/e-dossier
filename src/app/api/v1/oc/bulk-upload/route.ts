// src/app/api/v1/oc/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ocCadets, ocPersonal } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { checkApiRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/ratelimit';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

// ---------- Body ----------
const BodySchema = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1),
});

// ---------- Helpers ----------
function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/['`’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(row: Record<string, any>, aliases: string[]): any {
  const map: Record<string, any> = {};
  for (const k of Object.keys(row)) map[norm(k)] = row[k];
  for (const a of aliases) {
    const v = map[norm(a)];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function parseYesNo(val: any): boolean | undefined {
  if (val == null) return undefined;
  const s = String(val).toLowerCase().trim();
  if (!s) return undefined;
  if (['yes', 'y', 'true', 't', '1', 'swimmer'].includes(s)) return true;
  if (['no', 'n', 'false', 'f', '0', 'non swimmer', 'non-swimmer'].includes(s)) return false;
  return undefined;
}

// Excel serial (days since 1899-12-30) → Date(UTC)
function fromExcelSerial(n: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.round(n) * 86400000);
}

function toDate(val: any): Date | undefined {
  if (val == null || val === '') return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === 'number' && isFinite(val)) return fromExcelSerial(val);
  if (typeof val === 'string' && /^\d{4,6}$/.test(val.trim())) return fromExcelSerial(parseInt(val.trim(), 10));

  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------- Resolvers ----------
async function resolveCourseId(courseText: string): Promise<string | null> {
  const s = courseText.trim();
  if (!s) return null;
  const lc = s.toLowerCase();
  const rows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        isNull(courses.deletedAt),
        // match by code OR title (case-insensitive)
        sql`lower(${courses.code}) = ${lc} OR lower(${courses.title}) = ${lc}`
      )
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function resolvePlatoonId(plText: string): Promise<string | null> {
  const raw = (plText ?? '').toString().trim();
  if (!raw) return null;

  // If it's a UUID, try id first
  if (isUuidLike(raw)) {
    const r = await db
      .select({ id: platoons.id })
      .from(platoons)
      .where(and(eq(platoons.id, raw), isNull(platoons.deletedAt)))
      .limit(1);
    if (r[0]?.id) return r[0].id;
  }

  const lc = raw.toLowerCase();
  // Try by key or name (case-insensitive)
  const rows = await db
    .select({ id: platoons.id })
    .from(platoons)
    .where(and(isNull(platoons.deletedAt), sql`lower(${platoons.key}) = ${lc} OR lower(${platoons.name}) = ${lc}`))
    .limit(1);
  return rows[0]?.id ?? null;
}

// ---------- Uniqueness checks in DB ----------
async function existsOcNo(ocNo: string): Promise<boolean> {
  const rows = await db
    .select({ id: ocCadets.id })
    .from(ocCadets)
    .where(eq(ocCadets.ocNo, ocNo))
    .limit(1);
  return !!rows[0];
}

async function existsPersonalField<K extends keyof typeof ocPersonal['_']['columns']>(
  col: (typeof ocPersonal)[K],
  value: string
): Promise<boolean> {
  const rows = await db.select({ ocId: ocPersonal.ocId }).from(ocPersonal).where(eq(col as any, value)).limit(1);
  return !!rows[0];
}

// ---------- Handler ----------
async function POSTHandler(req: NextRequest) {
  try {
    const authCtx = await requireAuth(req);

    // Rate limit
    const ip = getClientIp(req);
    const rate = await checkApiRateLimit(ip);
    if (!rate.success) {
      return new NextResponse('Too Many Requests', { status: 429, headers: getRateLimitHeaders(rate) });
    }

    const { rows } = BodySchema.parse(await req.json());

    const errors: Array<{ row: number; error: string }> = [];
    let success = 0;
    const createdRecords: Array<{
      ocId: string;
      ocNo: string;
      courseId: string;
      platoonId: string | null;
      arrivalAtUniversity: Date;
    }> = [];

    // In-file duplicate guards (so we also catch duplicates within the uploaded file)
    const seenOcNo = new Set<string>();      // <--- TES No / OC No in-file uniqueness
    const seenEmail = new Set<string>();
    const seenPan = new Set<string>();
    const seenAadhaar = new Set<string>();
    const seenUpsc = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, any>;

      // --- Pick all relevant fields from raw row ---
      const tesNo = pick(row, ['Tes No', 'TesNo', 'TES NO', 'OC No', 'OC Number']);
      const name = pick(row, ['Name']);
      const courseText = pick(row, ['Course', 'Course Code', 'Course Name']);
      const dtOfArrival = pick(row, ['Dt of Arrival', 'Date of Arrival', 'DOA']);

      const visibleIdentMarks = pick(row, ['Visible Iden Mks', 'Visible Ident Marks']);
      const pi = pick(row, ['PI']);
      const dob = pick(row, ['DOB', 'Date of Birth']);

      const email = pick(row, ['E mail', 'Email']);
      const panNo = pick(row, ['PAN Card No', 'PAN No']);
      const aadhaarNo = pick(row, ['Aadhar No', 'Aadhaar No']);
      const upscRollNo = pick(row, ['UPSC Roll No']);

      const placeOfBirth = pick(row, ['Place of Birth']);
      const domicile = pick(row, ['Domicile']);
      const religion = pick(row, ['Religion']);
      const nationality = pick(row, ['Nationality']);
      const bloodGroup = pick(row, ['Blood GP', 'Blood Group', 'Blood Gp']);
      const identMarks = pick(row, ['Iden Marks', 'Identification Marks']);

      const fatherName = pick(row, ["Father's Name", 'Fathers Name']);
      const fatherMobile = pick(row, ["Father's Mobile", "Father's Mobile No", 'Fathers Mobile']);
      const fatherAddress = pick(row, ["Father's Address", 'Father Address']);
      const fatherProfession = pick(row, ["Father's Profession", 'Father Profession']);

      const guardianName = pick(row, ['Guardian Name', "Guardian's Name"]);
      const guardianAddress = pick(row, ["Guardian's Address", 'Guardian Address']);
      const monthlyIncome = pick(row, ['Income(parents)', 'Monthly Income']);

      const nokDetails = pick(row, ['Detls of NOK', 'Details of NOK']);
      const permAndPresent = pick(row, ['Permanent & Present Address']);
      const nearestRailwayStation = pick(row, ['Nearest RLY Stn', 'Nearest Railway Station']);
      const familyInSecunderabad = pick(row, ['Address of Family/Friends in Secunderbad', 'Address of Family/Friends in Secunderabad', 'Secunderabad Addr']);
      const relativeInArmedForces = pick(row, ['RK Name & Relan of near Relative in Armed force', 'Relative Armed Forces']);

      const govtFinAsstMobNo = pick(row, ['Govt Fin Asst Mob No']);
      const passportNo = pick(row, ['Passport No']);
      const bankDetails = pick(row, ['Bank Detail', 'Bank Details']);
      const idenCardNo = pick(row, ['Iden card No', 'Id Card No']);
      const ssbCentre = pick(row, ['SSB Centre']);
      const games = pick(row, ['Games']);
      const hobbies = pick(row, ['Hobbies']);
      const swimmerText = pick(row, ['Swimmer/Non Swimmer', 'Swimmer Status']);
      const languages = pick(row, ['Language', 'Languages']);

      // NEW: platoon (optional)
      const platoonText = pick(row, ['Platoon', 'PlatoonId', 'Platoon Id', 'PL', 'Pl']);

      // --- Required fields check ---
      const missing: string[] = [];
      if (!tesNo) missing.push('Tes No');
      if (!name) missing.push('Name');
      if (!courseText) missing.push('Course');
      if (!dtOfArrival) missing.push('Dt of Arrival');
      if (missing.length) {
        errors.push({ row: i + 1, error: `Missing required: ${missing.join(', ')}` });
        continue;
      }

      // --- Course must exist ---
      const courseId = await resolveCourseId(String(courseText));
      if (!courseId) {
        errors.push({
          row: i + 1,
          error: `Course not found: ${String(courseText)}. Please create the course first.`,
        });
        continue;
      }

      // --- Date parsing ---
      const arrivalAtUniversity = toDate(dtOfArrival);
      if (!arrivalAtUniversity) {
        errors.push({ row: i + 1, error: `Invalid date for Dt of Arrival: ${dtOfArrival}` });
        continue;
      }

      // --- Optional platoon resolution (if provided) ---
      let platoonId: string | null = null;
      if (platoonText != null && String(platoonText).trim() !== '') {
        platoonId = await resolvePlatoonId(String(platoonText));
        if (!platoonId) {
          errors.push({ row: i + 1, error: `Platoon not found: ${String(platoonText)}` });
          continue;
        }
      }

      // --- Uniqueness checks (first in-file, then DB) ---

      // TES No / OC No uniqueness
      const ocNo = String(tesNo).trim();
      if (seenOcNo.has(ocNo)) {
        errors.push({ row: i + 1, error: `Duplicate TES No in upload: ${ocNo}` });
        continue;
      }
      seenOcNo.add(ocNo);
      if (await existsOcNo(ocNo)) {
        errors.push({ row: i + 1, error: `TES No already exists: ${ocNo}` });
        continue;
      }

      const emailStr = email ? String(email).trim().toLowerCase() : '';
      if (emailStr) {
        if (seenEmail.has(emailStr)) {
          errors.push({ row: i + 1, error: `Duplicate email in upload: ${emailStr}` });
          continue;
        }
        seenEmail.add(emailStr);
        if (await existsPersonalField('email' as any, emailStr)) {
          errors.push({ row: i + 1, error: `Email already exists: ${emailStr}` });
          continue;
        }
      }

      const panStr = panNo ? String(panNo).trim().toUpperCase() : '';
      if (panStr) {
        if (seenPan.has(panStr)) {
          errors.push({ row: i + 1, error: `Duplicate PAN in upload: ${panStr}` });
          continue;
        }
        seenPan.add(panStr);
        if (await existsPersonalField('panNo' as any, panStr)) {
          errors.push({ row: i + 1, error: `PAN already exists: ${panStr}` });
          continue;
        }
      }

      const aadhaarStr = aadhaarNo ? String(aadhaarNo).trim() : '';
      if (aadhaarStr) {
        if (seenAadhaar.has(aadhaarStr)) {
          errors.push({ row: i + 1, error: `Duplicate Aadhaar in upload: ${aadhaarStr}` });
          continue;
        }
        seenAadhaar.add(aadhaarStr);
        if (await existsPersonalField('aadhaarNo' as any, aadhaarStr)) {
          errors.push({ row: i + 1, error: `Aadhaar already exists: ${aadhaarStr}` });
          continue;
        }
      }

      const upscStr = upscRollNo ? String(upscRollNo).trim() : '';
      if (upscStr) {
        if (seenUpsc.has(upscStr)) {
          errors.push({ row: i + 1, error: `Duplicate UPSC Roll No in upload: ${upscStr}` });
          continue;
        }
        seenUpsc.add(upscStr);
        if (await existsPersonalField('upscRollNo' as any, upscStr)) {
          errors.push({ row: i + 1, error: `UPSC Roll No already exists: ${upscStr}` });
          continue;
        }
      }

      // --- Parse other fields ---
      const swimmer = parseYesNo(swimmerText);

      let govtFinancialAssistance: boolean | undefined;
      let mobileNo: string | undefined;
      if (govtFinAsstMobNo != null && `${govtFinAsstMobNo}`.trim() !== '') {
        const s = String(govtFinAsstMobNo).trim();
        govtFinancialAssistance = true; // presence implies true
        mobileNo = s.replace(/[^0-9+]/g, '').slice(0, 20) || undefined;
      }

      let nokAddrPerm: string | undefined;
      let nokAddrPresent: string | undefined;
      if (permAndPresent) {
        const parts = String(permAndPresent).split(/\n|;|\//);
        nokAddrPerm = parts[0]?.trim();
        nokAddrPresent = parts[1]?.trim();
      }

      const dobDate = toDate(dob);
      const monthlyIncomeNum =
        monthlyIncome == null || monthlyIncome === ''
          ? undefined
          : (() => {
            const n = parseInt(String(monthlyIncome).replace(/[^0-9-]/g, ''), 10);
            return isNaN(n) ? undefined : n;
          })();

      // --- Insert (single transaction per row) ---
      try {
        const inserted = await db.transaction(async (tx) => {
          const uid = `UID-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const [oc] = await tx
            .insert(ocCadets)
            .values({
              name: String(name).trim(),
              ocNo,
              uid,
              courseId,
              // branch could be parsed if you want; left as-is from original route
              platoonId: platoonId ?? null,
              arrivalAtUniversity,
            })
            .returning({ id: ocCadets.id });

          await tx.insert(ocPersonal).values({
            ocId: oc.id,
            visibleIdentMarks: visibleIdentMarks ? String(visibleIdentMarks) : undefined,
            pi: pi ? String(pi) : undefined,
            dob: dobDate,
            placeOfBirth: placeOfBirth ? String(placeOfBirth) : undefined,
            domicile: domicile ? String(domicile) : undefined,
            religion: religion ? String(religion) : undefined,
            nationality: nationality ? String(nationality) : undefined,
            bloodGroup: bloodGroup ? String(bloodGroup) : undefined,
            identMarks: identMarks ? String(identMarks) : undefined,
            mobileNo,
            email: emailStr || undefined,
            passportNo: passportNo ? String(passportNo) : undefined,
            panNo: panStr || undefined,
            aadhaarNo: aadhaarStr || undefined,
            fatherName: fatherName ? String(fatherName) : undefined,
            fatherMobile: fatherMobile ? String(fatherMobile) : undefined,
            fatherAddrPerm: fatherAddress ? String(fatherAddress) : undefined,
            fatherProfession: fatherProfession ? String(fatherProfession) : undefined,
            guardianName: guardianName ? String(guardianName) : undefined,
            guardianAddress: guardianAddress ? String(guardianAddress) : undefined,
            monthlyIncome: monthlyIncomeNum,
            nokDetails: nokDetails ? String(nokDetails) : undefined,
            nokAddrPerm,
            nokAddrPresent,
            nearestRailwayStation: nearestRailwayStation ? String(nearestRailwayStation) : undefined,
            familyInSecunderabad: familyInSecunderabad ? String(familyInSecunderabad) : undefined,
            relativeInArmedForces: relativeInArmedForces ? String(relativeInArmedForces) : undefined,
            govtFinancialAssistance,
            bankDetails: bankDetails ? String(bankDetails) : undefined,
            idenCardNo: idenCardNo ? String(idenCardNo) : undefined,
            upscRollNo: upscStr || undefined,
            ssbCentre: ssbCentre ? String(ssbCentre) : undefined,
            games: games ? String(games) : undefined,
            hobbies: hobbies ? String(hobbies) : undefined,
            swimmer: swimmer,
            languages: languages ? String(languages) : undefined,
          });

          return {
            ocId: oc.id,
            ocNo,
            courseId,
            platoonId: platoonId ?? null,
            arrivalAtUniversity,
          };
        });
        createdRecords.push(inserted);
        success += 1;
      } catch (e: any) {
        console.error('[oc/bulk-upload] failed row', i + 1, e);
        if (e?.code === '23505') {
          errors.push({ row: i + 1, error: 'Duplicate key violation while inserting OC/Personal details' });
        } else {
          errors.push({ row: i + 1, error: e?.message || 'Failed to insert record' });
        }
      }
    }

    await createAuditLog({
      actorUserId: authCtx.userId,
      eventType: AuditEventType.OC_BULK_IMPORTED,
      resourceType: AuditResourceType.OC,
      resourceId: null,
      description: `Bulk uploaded ${success} OC records (${errors.length} failed)`,
      metadata: {
        success,
        failed: errors.length,
        created: createdRecords.map((record) => ({
          ocId: record.ocId,
          ocNo: record.ocNo,
          courseId: record.courseId,
          platoonId: record.platoonId,
          arrivalAtUniversity: record.arrivalAtUniversity.toISOString(),
        })),
        errorSamples: errors.slice(0, 25),
      },
      request: req,
    });

    const res = json.ok({ message: 'Bulk upload processed successfully.', success, failed: errors.length, errors });
    res.headers.set('X-RateLimit-Limit', rate.limit.toString());
    res.headers.set('X-RateLimit-Remaining', rate.remaining.toString());
    res.headers.set('X-RateLimit-Reset', rate.reset.toString());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
export const POST = withRouteLogging('POST', POSTHandler);
