import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi, type RbacPermission } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'permissions'] as const;
const PAGE_SIZE = 500;

export async function fetchAllRbacPermissions() {
  const items: RbacPermission[] = [];
  let total = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await rbacApi.listPermissions({ limit: PAGE_SIZE, offset });
    items.push(...(res.items ?? []));
    total = res.total ?? items.length;
    hasMore = Boolean(res.hasMore);
    offset += res.limit || PAGE_SIZE;
  }

  return {
    items,
    total,
    loadedCount: items.length,
  };
}

export function useRbacPermissions() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchAllRbacPermissions,
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
    data: query.data?.items ?? [],
    total: query.data?.total ?? query.data?.items.length ?? 0,
    loadedCount: query.data?.loadedCount ?? query.data?.items.length ?? 0,
    createPermission,
    updatePermission,
    deletePermission,
  };
}
