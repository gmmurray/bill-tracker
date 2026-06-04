import { useQuery } from '@tanstack/react-query';
import { listPaySchedules } from './pay-schedules-service';

export const payScheduleKeys = {
  all: ['paySchedules'] as const,
  lists: () => [...payScheduleKeys.all, 'list'] as const,
};

export function usePaySchedules() {
  return useQuery({
    queryKey: payScheduleKeys.lists(),
    queryFn: () => listPaySchedules(),
    staleTime: 5 * 60 * 1000,
  });
}
