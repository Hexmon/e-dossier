import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'permissions'] as const;

export function useRbacPermissions() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await rbacApi.listPermissions({ limit: 500 });
      return res.items ?? [];
    },
  });

  const createPermission = useMutation({
    mutationFn: rbacApi.createPermission,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const updatePermission = useMutation({
    mutationFn: ({ permissionId, input }: { permissionId: string; input: { key?: string; description?: string | null } }) =>
      rbacApi.updatePermission(permissionId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deletePermission = useMutation({
    mutationFn: (permissionId: string) => rbacApi.deletePermission(permissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    ...query,
    createPermission,
    updatePermission,
    deletePermission,
  };
}

