import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'field-rules'] as const;

export function useRbacFieldRules() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await rbacApi.listFieldRules();
      return res.items ?? [];
    },
  });

  const createRule = useMutation({
    mutationFn: rbacApi.createFieldRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const updateRule = useMutation({
    mutationFn: ({ ruleId, input }: { ruleId: string; input: Parameters<typeof rbacApi.updateFieldRule>[1] }) =>
      rbacApi.updateFieldRule(ruleId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => rbacApi.deleteFieldRule(ruleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    ...query,
    createRule,
    updateRule,
    deleteRule,
  };
}

