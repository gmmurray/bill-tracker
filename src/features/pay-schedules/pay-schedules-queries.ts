import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePayScheduleInput,
  PaySchedule,
  UpdatePayScheduleInput,
} from './pay-schedules-model';
import {
  archivePaySchedule,
  createPaySchedule,
  getPayScheduleDetail,
  listPaySchedules,
  updatePaySchedule,
} from './pay-schedules-service';

export const payScheduleKeys = {
  all: ['paySchedules'] as const,
  lists: () => [...payScheduleKeys.all, 'list'] as const,
  detail: (id: string) => [...payScheduleKeys.all, 'detail', id] as const,
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
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
    },
  });
}

export function useUpdatePaySchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePayScheduleInput) =>
      updatePaySchedule({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
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
    onError: (_err, _scheduleId, context) => {
      if (context) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: payScheduleKeys.lists() });
    },
  });
}
