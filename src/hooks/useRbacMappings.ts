import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'mappings'] as const;
const ROLES_KEY = ['rbac', 'roles-and-positions'] as const;

export function useRbacMappings() {
  const qc = useQueryClient();

  const mappings = useQuery({
    queryKey: KEY,
    queryFn: () => rbacApi.listMappings(),
  });

  const rolesAndPositions = useQuery({
    queryKey: ROLES_KEY,
    queryFn: rbacApi.listRolesAndPositions,
  });

  const setRoleMappings = useMutation({
    mutationFn: (input: { roleId: string; permissionIds: string[] }) => rbacApi.setRoleMappings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });

  const setPositionMappings = useMutation({
    mutationFn: (input: { positionId: string; permissionIds: string[] }) => rbacApi.setPositionMappings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ROLES_KEY });
    },
  });

  return {
    mappings,
    rolesAndPositions,
    setRoleMappings,
    setPositionMappings,
  };
}
