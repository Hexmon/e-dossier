import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/app/lib/api/rbacApi';

const KEY = ['rbac', 'field-rules'] as const;
const EMPTY_DEFAULTS = {
  defaultFieldRules: [],
  missingDefaultFieldRules: [],
};

export function useRbacFieldRules() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await rbacApi.listFieldRules();
      return {
        items: res.items ?? [],
        defaults: res.defaults ?? EMPTY_DEFAULTS,
      };
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
    data: query.data?.items ?? [],
    defaults: query.data?.defaults ?? EMPTY_DEFAULTS,
    createRule,
    updateRule,
    deleteRule,
  };
}
