import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { billKeys } from '#/features/bills/bills-queries';
import { getErrorMessage } from '#/lib/utils';
import type {
  CreatePayScheduleInput,
  PaySchedule,
  UpdatePayScheduleInput,
} from './pay-schedules-model';
import {
  archivePaySchedule,
  createPaySchedule,
  deletePaySchedule,
  getArchivedPaySchedules,
  getArchivedPaySchedulesCount,
  getPayScheduleDetail,
  listPaySchedules,
  restorePaySchedule,
  updatePaySchedule,
} from './pay-schedules-service';

export const payScheduleKeys = {
  all: ['paySchedules'] as const,
  lists: () => [...payScheduleKeys.all, 'list'] as const,
  detail: (id: string) => [...payScheduleKeys.all, 'detail', id] as const,
  archived: () => [...payScheduleKeys.all, 'archived'] as const,
  archivedCount: () => [...payScheduleKeys.all, 'archivedCount'] as const,
};

export function usePaySchedules() {
  return useQuery({
    queryKey: payScheduleKeys.lists(),
    queryFn: () => listPaySchedules(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePayScheduleDetail(scheduleId: string) {
  return useQuery({
    queryKey: payScheduleKeys.detail(scheduleId),
    queryFn: () => getPayScheduleDetail({ data: { scheduleId } }),
  });
}

export function useCreatePaySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePayScheduleInput) =>
      createPaySchedule({ data: input }),
    onSuccess: () => {
      toast.success('Schedule created');
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to create schedule'));
    },
  });
}

export function useUpdatePaySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePayScheduleInput) =>
      updatePaySchedule({ data: input }),
    onSuccess: () => {
      toast.success('Schedule saved');
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to save schedule'));
    },
  });
}

export function useArchivedPaySchedules() {
  return useQuery({
    queryKey: payScheduleKeys.archived(),
    queryFn: () => getArchivedPaySchedules(),
  });
}

export function useArchivedPaySchedulesCount() {
  return useQuery({
    queryKey: payScheduleKeys.archivedCount(),
    queryFn: () => getArchivedPaySchedulesCount(),
  });
}

export function useRestorePaySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      restorePaySchedule({ data: { scheduleId } }),
    onSuccess: () => {
      toast.success('Schedule restored');
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.archived() });
      queryClient.invalidateQueries({
        queryKey: payScheduleKeys.archivedCount(),
      });
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
    },
    onError: err => {
      toast.error(getErrorMessage(err, 'Failed to restore schedule'));
    },
  });
}

export function useDeletePaySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      deletePaySchedule({ data: { scheduleId } }),
    onMutate: async scheduleId => {
      await queryClient.cancelQueries({
        queryKey: payScheduleKeys.archived(),
      });
      const snapshot = queryClient.getQueriesData<PaySchedule[]>({
        queryKey: payScheduleKeys.archived(),
      });
      queryClient.setQueriesData<PaySchedule[]>(
        { queryKey: payScheduleKeys.archived() },
        old => old?.filter(s => s.id !== scheduleId),
      );
      return { snapshot };
    },
    onError: (err, _scheduleId, context) => {
      if (context) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(getErrorMessage(err, 'Failed to delete schedule'));
    },
    onSuccess: () => {
      toast.success('Schedule permanently deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.archived() });
      queryClient.invalidateQueries({
        queryKey: payScheduleKeys.archivedCount(),
      });
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billKeys.details() });
    },
  });
}

export function useArchivePaySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      archivePaySchedule({ data: { scheduleId } }),
    onMutate: async scheduleId => {
      await queryClient.cancelQueries({ queryKey: payScheduleKeys.lists() });
      const snapshot = queryClient.getQueriesData<PaySchedule[]>({
        queryKey: payScheduleKeys.lists(),
      });
      queryClient.setQueriesData<PaySchedule[]>(
        { queryKey: payScheduleKeys.lists() },
        old => old?.filter(s => s.id !== scheduleId),
      );
      return { snapshot };
    },
    onError: (err, _scheduleId, context) => {
      if (context) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(getErrorMessage(err, 'Failed to archive schedule'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
    },
  });
}
