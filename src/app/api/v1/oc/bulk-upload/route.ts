// src/app/api/v1/oc/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/app/db/client';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { ocCadets, ocPersonal } from '@/app/db/schema/training/oc';
import { courses } from '@/app/db/schema/training/courses';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { checkApiRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/ratelimit';

// Accept an array of arbitrary row objects (as parsed from Excel)
const BodySchema = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1)
});

// Helper to normalize header names for robust matching
function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/['`’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract value from a raw row using a set of alias headers
function pick(row: Record<string, any>, aliases: string[]): any {
  // Build normalized map once
  const map: Record<string, any> = {};
  for (const k of Object.keys(row)) map[norm(k)] = row[k];
  for (const a of aliases) {
    const v = map[norm(a)];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

// Parse boolean like "Swimmer/Non Swimmer", "Yes/No", etc.
function parseYesNo(val: any): boolean | undefined {
  if (val == null) return undefined;
  const s = String(val).toLowerCase().trim();
  if (!s) return undefined;
  if (['yes', 'y', 'true', 't', '1', 'swimmer'].includes(s)) return true;
  if (['no', 'n', 'false', 'f', '0', 'non swimmer', 'non-swimmer'].includes(s)) return false;
  return undefined;
}

function toDate(val: any): Date | undefined {
  if (val == null || val === '') return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

function toInt(val: any): number | undefined {
  if (val == null || val === '') return undefined;
  const n = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
  return isNaN(n) ? undefined : n;
}

// Resolve courseId by code or title
async function resolveCourseId(courseText: string): Promise<string | null> {
  const s = courseText.trim();
  if (!s) return null;
  const lc = s.toLowerCase();
  const rows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(
      isNull(courses.deletedAt),
      // match either code or title case-insensitive
      sql`lower(${courses.code}) = ${lc} OR lower(${courses.title}) = ${lc}`
    ))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    // Rate limit
    const ip = getClientIp(req);
    const rate = await checkApiRateLimit(ip);
    if (!rate.success) {
      return new NextResponse('Too Many Requests', { status: 429, headers: getRateLimitHeaders(rate) });
    }

    const { rows } = BodySchema.parse(await req.json());

    const errors: Array<{ row: number; error: string }> = [];
    let success = 0;

    // Precompute: nothing heavy for now

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, any>;

      // Extract canonical fields from raw row
      const tesNo = pick(row, ['Tes No', 'TesNo', 'TES NO', 'OC No', 'OC Number']);
      const name = pick(row, ['Name']);
      const courseText = pick(row, ['Course', 'Course Code', 'Course Name']);
      const dtOfArrival = pick(row, ['Dt of Arrival', 'Date of Arrival', 'DOA']);

      const visibleIdentMarks = pick(row, ['Visible Iden Mks', 'Visible Ident Marks']);
      const pi = pick(row, ['PI']);
      const dob = pick(row, ['DOB', 'Date of Birth']);
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
      const email = pick(row, ['E mail', 'Email']);
      const passportNo = pick(row, ['Passport No']);
      const panNo = pick(row, ['PAN Card No', 'PAN No']);
      const aadhaarNo = pick(row, ['Aadhar No', 'Aadhaar No']);
      const bankDetails = pick(row, ['Bank Detail', 'Bank Details']);
      const idenCardNo = pick(row, ['Iden card No', 'Id Card No']);
      const upscRollNo = pick(row, ['UPSC Roll No']);
      const ssbCentre = pick(row, ['SSB Centre']);
      const games = pick(row, ['Games']);
      const hobbies = pick(row, ['Hobbies']);
      const swimmerText = pick(row, ['Swimmer/Non Swimmer', 'Swimmer Status']);
      const languages = pick(row, ['Language', 'Languages']);

      // Validate required
      const missing: string[] = [];
      if (!tesNo) missing.push('Tes No');
      if (!name) missing.push('Name');
      if (!courseText) missing.push('Course');
      if (!dtOfArrival) missing.push('Dt of Arrival');
      if (missing.length) {
        errors.push({ row: i + 1, error: `Missing required: ${missing.join(', ')}` });
        continue;
      }

      const arrivalAtUniversity = toDate(dtOfArrival);
      if (!arrivalAtUniversity) {
        errors.push({ row: i + 1, error: `Invalid date for Dt of Arrival: ${dtOfArrival}` });
        continue;
      }

      const courseId = await resolveCourseId(String(courseText));
      if (!courseId) {
        errors.push({ row: i + 1, error: `Course not found: ${String(courseText)}` });
        continue;
      }

      // Parse special fields
      const swimmer = parseYesNo(swimmerText);

      // Govt financial assistance + mobile no from combined field
      let govtFinancialAssistance: boolean | undefined;
      let mobileNo: string | undefined;
      if (govtFinAsstMobNo != null && `${govtFinAsstMobNo}`.trim() !== '') {
        const s = String(govtFinAsstMobNo).trim();
        govtFinancialAssistance = true; // presence implies true
        mobileNo = s.replace(/[^0-9+]/g, '').slice(0, 20) || undefined;
      }

      // Split Permanent & Present Address (best-effort using newline or ; or /)
      let nokAddrPerm: string | undefined;
      let nokAddrPresent: string | undefined;
      if (permAndPresent) {
        const parts = String(permAndPresent).split(/\n|;|\//);
        nokAddrPerm = parts[0]?.trim();
        nokAddrPresent = parts[1]?.trim();
      }

      const dobDate = toDate(dob);
      const monthlyIncomeNum = toInt(monthlyIncome);

      try {
        await db.transaction(async (tx) => {
          const uid = `UID-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const [oc] = await tx
            .insert(ocCadets)
            .values({
              name: String(name).trim(),
              ocNo: String(tesNo).trim(),
              uid,
              courseId,
              arrivalAtUniversity,
            })
            .returning({ id: ocCadets.id });

          // Insert personal particulars
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
            email: email ? String(email) : undefined,
            passportNo: passportNo ? String(passportNo) : undefined,
            panNo: panNo ? String(panNo) : undefined,
            aadhaarNo: aadhaarNo ? String(aadhaarNo) : undefined,
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
            upscRollNo: upscRollNo ? String(upscRollNo) : undefined,
            ssbCentre: ssbCentre ? String(ssbCentre) : undefined,
            games: games ? String(games) : undefined,
            hobbies: hobbies ? String(hobbies) : undefined,
            swimmer: swimmer,
            languages: languages ? String(languages) : undefined,
          });
        });
        success += 1;
      } catch (e: any) {
        console.error('[oc/bulk-upload] failed row', i + 1, e);
        errors.push({ row: i + 1, error: e?.message || 'Failed to insert record' });
      }
    }

    const res = json.ok({ success, failed: errors.length, errors });
    // Attach rate limit headers
    res.headers.set('X-RateLimit-Limit', rate.limit.toString());
    res.headers.set('X-RateLimit-Remaining', rate.remaining.toString());
    res.headers.set('X-RateLimit-Reset', rate.reset.toString());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

