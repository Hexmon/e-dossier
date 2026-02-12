import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'roles-and-positions'] as const;

export function useRbacRoles() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: rbacApi.listRolesAndPositions,
  });

  const createRole = useMutation({
    mutationFn: rbacApi.createRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const updateRole = useMutation({
    mutationFn: ({ roleId, input }: { roleId: string; input: { key?: string; description?: string | null } }) =>
      rbacApi.updateRole(roleId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteRole = useMutation({
    mutationFn: (roleId: string) => rbacApi.deleteRole(roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    ...query,
    createRole,
    updateRole,
    deleteRole,
  };
}
