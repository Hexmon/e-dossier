import {
  hasSuperAdminAuthority,
} from "@/lib/dossier-semester-access";
import { isBroadScopedPlatoonCommander } from "@/lib/platoon-commander-access";

type MedicalWriteAccessInput = {
  roles?: Array<string | null | undefined> | null;
  position?: string | null;
  scopeType?: string | null;
};

export function canWriteMedicalRecords(input: MedicalWriteAccessInput): boolean {
  if (
    hasSuperAdminAuthority({
      roles: input.roles?.filter((role): role is string => typeof role === "string") ?? null,
      position: input.position,
    })
  ) {
    return true;
  }

  return isBroadScopedPlatoonCommander({
    roles: input.roles,
    position: input.position,
    scopeType: input.scopeType,
  });
}
