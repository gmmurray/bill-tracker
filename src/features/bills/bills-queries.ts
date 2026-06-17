import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '#/lib/utils';
import type {
  Bill,
  BillListFilters,
  BillWithSchedule,
  BulkAssignBillsInput,
  CreateBillInput,
  LogHistoricalPaymentInput,
  UpdateBillInput,
} from './bills-model';
import {
  archiveBill,
  bulkAssignBills,
  createBill,
  deleteBill,
  deleteBillInstance,
  getArchivedBills,
  getArchivedBillsCount,
  getBillDetail,
  listBills,
  listCurrentMonthInstances,
  logHistoricalPayment,
  recordBillPayment,
  restoreBill,
  updateBill,
  updateBillInstance,
} from './bills-service';

export const billKeys = {
  all: ['bills'] as const,
  lists: () => [...billKeys.all, 'list'] as const,
  list: (filters: BillListFilters) => [...billKeys.lists(), filters] as const,
  details: () => [...billKeys.all, 'detail'] as const,
  detail: (id: string) => [...billKeys.details(), id] as const,
  archived: () => [...billKeys.all, 'archived'] as const,
  archivedCount: () => [...billKeys.all, 'archivedCount'] as const,
  currentMonthInstances: () =>
    [...billKeys.all, 'currentMonthInstances'] as const,
};

export function billsQueryOptions(filters: BillListFilters) {
  return queryOptions({
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

export function billDetailQueryOptions(
  billId: string,
  page?: number,
  pageSize?: number,
) {
  return queryOptions({
    queryKey: [...billKeys.detail(billId), page ?? 1, pageSize ?? 20],
    queryFn: () => getBillDetail({ data: { billId, page, pageSize } }),
  });
}

export function archivedBillsQueryOptions() {
  return queryOptions({
    queryKey: billKeys.archived(),
    queryFn: () => getArchivedBills(),
  });
}

export function archivedBillsCountQueryOptions() {
  return queryOptions({
    queryKey: billKeys.archivedCount(),
    queryFn: () => getArchivedBillsCount(),
  });
}

export function useBills(filters: BillListFilters) {
  return useQuery(billsQueryOptions(filters));
}

export function useBillDetail(
  billId: string,
  page?: number,
  pageSize?: number,
) {
  return useQuery(billDetailQueryOptions(billId, page, pageSize));
}

export function useArchivedBills() {
  return useQuery(archivedBillsQueryOptions());
}

export function useArchivedBillsCount() {
  return useQuery(archivedBillsCountQueryOptions());
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBillInput) => createBill({ data: input }),
    onSuccess: () => {
      toast.success('Bill created');
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to create bill'));
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBillInput) => updateBill({ data: input }),
    onSuccess: (_data, variables) => {
      toast.success('Bill saved');
      queryClient.invalidateQueries({
        queryKey: billKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to save bill'));
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
    onError: (err, _billId, context) => {
      if (context) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(getErrorMessage(err, 'Failed to archive bill'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billKeys.archivedCount() });
    },
  });
}

export function currentMonthInstancesQueryOptions() {
  return queryOptions({
    queryKey: billKeys.currentMonthInstances(),
    queryFn: () => listCurrentMonthInstances(),
  });
}

export function useCurrentMonthInstances() {
  return useQuery(currentMonthInstancesQueryOptions());
}

export function useRecordBillPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { billId: string; amountActual: number }) =>
      recordBillPayment({ data: input }),
    onSuccess: (_data, variables) => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: billKeys.detail(variables.billId),
      });
      queryClient.invalidateQueries({
        queryKey: billKeys.currentMonthInstances(),
      });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to record payment'));
    },
  });
}

export function useUpdateBillInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      instanceId: string;
      amountActual: number;
      billId: string;
    }) =>
      updateBillInstance({
        data: {
          instanceId: input.instanceId,
          amountActual: input.amountActual,
        },
      }),
    onSuccess: (_data, variables) => {
      toast.success('Payment updated');
      queryClient.invalidateQueries({
        queryKey: billKeys.detail(variables.billId),
      });
      queryClient.invalidateQueries({
        queryKey: billKeys.currentMonthInstances(),
      });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to update payment'));
    },
  });
}

export function useDeleteBillInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { instanceId: string; billId: string }) =>
      deleteBillInstance({ data: { instanceId: input.instanceId } }),
    onSuccess: (_data, variables) => {
      toast.success('Payment deleted');
      queryClient.invalidateQueries({
        queryKey: billKeys.detail(variables.billId),
      });
      queryClient.invalidateQueries({
        queryKey: billKeys.currentMonthInstances(),
      });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to delete payment'));
    },
  });
}

export function useLogHistoricalPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogHistoricalPaymentInput) =>
      logHistoricalPayment({ data: input }),
    onSuccess: (_data, variables) => {
      toast.success('Payment logged');
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: billKeys.detail(variables.billId),
      });
      queryClient.invalidateQueries({
        queryKey: billKeys.currentMonthInstances(),
      });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to log payment'));
    },
  });
}

export function useRestoreBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (billId: string) => restoreBill({ data: { billId } }),
    onSuccess: () => {
      toast.success('Bill restored');
      queryClient.invalidateQueries({ queryKey: billKeys.archived() });
      queryClient.invalidateQueries({ queryKey: billKeys.archivedCount() });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to restore bill'));
    },
  });
}

export function useBulkAssignBills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAssignBillsInput) =>
      bulkAssignBills({ data: input }),
    onSuccess: data => {
      toast.success(
        `${data.updatedCount} bill${data.updatedCount === 1 ? '' : 's'} assigned`,
      );
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to assign bills'));
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (billId: string) => deleteBill({ data: { billId } }),
    onMutate: async billId => {
      await queryClient.cancelQueries({ queryKey: billKeys.archived() });
      const snapshot = queryClient.getQueriesData<Bill[]>({
        queryKey: billKeys.archived(),
      });
      queryClient.setQueriesData<Bill[]>(
        { queryKey: billKeys.archived() },
        old => old?.filter(b => b.id !== billId),
      );
      return { snapshot };
    },
    onError: (err, _billId, context) => {
      if (context) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(getErrorMessage(err, 'Failed to delete bill'));
    },
    onSuccess: () => {
      toast.success('Bill permanently deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.archived() });
      queryClient.invalidateQueries({ queryKey: billKeys.archivedCount() });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: billKeys.currentMonthInstances(),
      });
    },
  });
}
