import 'dotenv/config';
import path from 'node:path';
import { seedPermissionsFromExcel } from '@/app/db/seeds/seedPermissionsFromExcel';

async function main() {
  const matrixPathArg = process.argv[2];
  const parsedPath = matrixPathArg
    ? path.resolve(matrixPathArg)
    : path.resolve(process.cwd(), 'docs/rbac/permission-matrix.parsed.json');

  const result = await seedPermissionsFromExcel(parsedPath);
  console.log(
    JSON.stringify(
      {
        parsedPath,
        rolesProcessed: result.rolesProcessed,
        permissionsProcessed: result.permissionsProcessed,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('Permission import failed:', error);
  process.exit(1);
});

