import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BillListFilters,
  BillWithSchedule,
  CreateBillInput,
  UpdateBillInput,
} from './bills-model';
import {
  archiveBill,
  createBill,
  getArchivedBills,
  getArchivedBillsCount,
  getBillDetail,
  listBills,
  updateBill,
} from './bills-service';

export const billKeys = {
  all: ['bills'] as const,
  lists: () => [...billKeys.all, 'list'] as const,
  list: (filters: BillListFilters) => [...billKeys.lists(), filters] as const,
  details: () => [...billKeys.all, 'detail'] as const,
  detail: (id: string) => [...billKeys.details(), id] as const,
  archived: () => [...billKeys.all, 'archived'] as const,
  archivedCount: () => [...billKeys.all, 'archivedCount'] as const,
};

export function useBills(filters: BillListFilters) {
  return useQuery({
    queryKey: billKeys.list(filters),
    queryFn: () =>
      listBills({
        data: {
          scheduleId: filters.scheduleId,
          manualOnly: filters.manualOnly,
        },
      }),
  });
}

export function useBillDetail(billId: string, page?: number) {
  return useQuery({
    queryKey: [...billKeys.detail(billId), page ?? 1],
    queryFn: () => getBillDetail({ data: { billId, page } }),
  });
}

export function useArchivedBills() {
  return useQuery({
    queryKey: billKeys.archived(),
    queryFn: () => getArchivedBills(),
  });
}

export function useArchivedBillsCount() {
  return useQuery({
    queryKey: billKeys.archivedCount(),
    queryFn: () => getArchivedBillsCount(),
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillInput) => createBill({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBillInput) => updateBill({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: billKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
  });
}

export function useArchiveBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (billId: string) => archiveBill({ data: { billId } }),
    onMutate: async billId => {
      await queryClient.cancelQueries({ queryKey: billKeys.lists() });
      const snapshot = queryClient.getQueriesData<BillWithSchedule[]>({
        queryKey: billKeys.lists(),
      });
      queryClient.setQueriesData<BillWithSchedule[]>(
        { queryKey: billKeys.lists() },
        old => old?.filter(b => b.id !== billId),
      );
      return { snapshot };
    },
    onError: (_err, _billId, context) => {
      if (context) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billKeys.archivedCount() });
    },
  });
}
