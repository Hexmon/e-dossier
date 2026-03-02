#!/usr/bin/env tsx
import 'dotenv/config';
import { applyPtTemplateProfile } from '../src/app/lib/bootstrap/pt-template';
import { applyCampTemplateProfile } from '../src/app/lib/bootstrap/camp-template';
import { applyPlatoonTemplateProfile } from '../src/app/lib/bootstrap/platoon-template';
import { applyAppointmentTemplateProfile } from '../src/app/lib/bootstrap/appointment-template';
import type {
  AppointmentTemplateProfile,
  CampTemplateProfile,
  OrgTemplateApplyResult,
  OrgTemplateModule,
  PlatoonTemplateProfile,
  PtTemplateProfile,
} from '../src/app/lib/bootstrap/types';

type ParsedArgs = {
  module: OrgTemplateModule;
  profile: PtTemplateProfile | CampTemplateProfile | PlatoonTemplateProfile | AppointmentTemplateProfile;
  dryRun: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const initial: ParsedArgs = {
    module: 'pt',
    profile: 'default',
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--') {
      continue;
    }

    if (arg === '--dry-run') {
      initial.dryRun = true;
      continue;
    }

    if (arg.startsWith('--module=')) {
      const value = arg.slice('--module='.length).trim();
      if (value !== 'pt' && value !== 'camp' && value !== 'platoon' && value !== 'appointment') {
        throw new Error(`Unsupported module "${value}". Supported modules: pt, camp, platoon, appointment`);
      }
      initial.module = value;
      continue;
    }

    if (arg.startsWith('--profile=')) {
      const value = arg.slice('--profile='.length).trim();
      if (value !== 'default') {
        throw new Error(`Unsupported profile "${value}". Supported profiles: default`);
      }
      initial.profile = value;
      continue;
    }

    throw new Error(
      `Unknown argument "${arg}". Supported: --module=pt|camp|platoon|appointment --profile=default --dry-run`
    );
  }

  return initial;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in environment.');
  }

  const args = parseArgs(process.argv.slice(2));

  console.log(
    `[org-template] module=${args.module} profile=${args.profile} dryRun=${args.dryRun ? 'true' : 'false'}`
  );

  let result: OrgTemplateApplyResult;
  if (args.module === 'pt') {
    result = await applyPtTemplateProfile({
      profile: args.profile as PtTemplateProfile,
      dryRun: args.dryRun,
    });
  } else if (args.module === 'camp') {
    result = await applyCampTemplateProfile({
      profile: args.profile as CampTemplateProfile,
      dryRun: args.dryRun,
    });
  } else if (args.module === 'platoon') {
    result = await applyPlatoonTemplateProfile({
      profile: args.profile as PlatoonTemplateProfile,
      dryRun: args.dryRun,
    });
  } else {
    result = await applyAppointmentTemplateProfile({
      profile: args.profile as AppointmentTemplateProfile,
      dryRun: args.dryRun,
    });
  }

  console.log('');
  console.log(result.dryRun ? 'Dry-run completed.' : 'Template apply completed.');
  console.log(`Created: ${result.createdCount}`);
  console.log(`Updated: ${result.updatedCount}`);
  console.log(`Skipped: ${result.skippedCount}`);

  console.log('');
  console.log('Table-wise stats:');
  if (result.module === 'pt') {
    console.log(`- PT Types: created=${result.stats.ptTypes.created}, updated=${result.stats.ptTypes.updated}, skipped=${result.stats.ptTypes.skipped}`);
    console.log(`- Attempts: created=${result.stats.attempts.created}, updated=${result.stats.attempts.updated}, skipped=${result.stats.attempts.skipped}`);
    console.log(`- Grades: created=${result.stats.grades.created}, updated=${result.stats.grades.updated}, skipped=${result.stats.grades.skipped}`);
    console.log(`- Tasks: created=${result.stats.tasks.created}, updated=${result.stats.tasks.updated}, skipped=${result.stats.tasks.skipped}`);
    console.log(`- Task Scores: created=${result.stats.taskScores.created}, updated=${result.stats.taskScores.updated}, skipped=${result.stats.taskScores.skipped}`);
    console.log(`- Motivation Fields: created=${result.stats.motivationFields.created}, updated=${result.stats.motivationFields.updated}, skipped=${result.stats.motivationFields.skipped}`);
  } else {
    if (result.module === 'camp') {
      console.log(`- Camps: created=${result.stats.camps.created}, updated=${result.stats.camps.updated}, skipped=${result.stats.camps.skipped}`);
      console.log(`- Activities: created=${result.stats.activities.created}, updated=${result.stats.activities.updated}, skipped=${result.stats.activities.skipped}`);
    } else if (result.module === 'platoon') {
      console.log(`- Platoons: created=${result.stats.platoons.created}, updated=${result.stats.platoons.updated}, skipped=${result.stats.platoons.skipped}`);
    } else {
      console.log(`- Positions: created=${result.stats.positions.created}, updated=${result.stats.positions.updated}, skipped=${result.stats.positions.skipped}`);
      console.log(`- Assignments: created=${result.stats.assignments.created}, updated=${result.stats.assignments.updated}, skipped=${result.stats.assignments.skipped}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('');
    console.warn(`Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.warn(`- ${warning}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[org-template] failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
