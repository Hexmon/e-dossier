import { useQuery } from '@tanstack/react-query';
import { rbacApi } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'roles-and-positions'] as const;

export function useRbacRoles() {
  return useQuery({
    queryKey: KEY,
    queryFn: rbacApi.listRolesAndPositions,
  });
}

