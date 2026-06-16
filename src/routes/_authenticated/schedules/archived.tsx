import { createFileRoute, Link } from '@tanstack/react-router';
import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import type { PaySchedule } from '#/features/pay-schedules/pay-schedules-model';
import {
  useArchivedPaySchedules,
  useArchivedPaySchedulesCount,
  useDeletePaySchedule,
  useRestorePaySchedule,
} from '#/features/pay-schedules/pay-schedules-queries';

export const Route = createFileRoute('/_authenticated/schedules/archived')({
  component: SchedulesArchivePage,
});

function SchedulesArchivePage() {
  const archivedQuery = useArchivedPaySchedules();
  const countQuery = useArchivedPaySchedulesCount();

  const count = countQuery.data?.count ?? 0;
  const schedules = archivedQuery.data ?? [];
  const isLoading = archivedQuery.isLoading;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          to="/schedules"
          className="text-sm text-chill-text-muted hover:text-chill-text transition-colors"
        >
          ← Back to Schedules
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-chill-text">
          Archived Schedules ({count})
        </h1>
      </div>

      <Card>
        {isLoading ? (
          <div className="px-6 py-10 text-center text-chill-text-muted text-sm">
            Loading...
          </div>
        ) : schedules.length === 0 ? (
          <div className="px-6 py-10 text-center text-chill-text-muted text-sm">
            No archived schedules.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chill-border text-left">
                <th className="px-4 py-3 font-medium text-chill-text-muted">
                  Name
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted w-32">
                  Anchor Day
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted w-44">
                  Archived
                </th>
                <th className="px-4 py-3 w-40" />
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => (
                <ArchivedScheduleRow key={schedule.id} schedule={schedule} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ArchivedScheduleRow({ schedule }: { schedule: PaySchedule }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const restoreMutation = useRestorePaySchedule();
  const deleteMutation = useDeletePaySchedule();

  return (
    <tr className="border-b border-chill-border last:border-0">
      <td className="px-4 py-3 font-medium">{schedule.name}</td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatOrdinal(schedule.anchorDay)}
      </td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatArchiveDate(schedule.updatedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="default"
            size="sm"
            disabled={restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(schedule.id)}
          >
            Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Permanently delete {schedule.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will unassign any bills currently assigned to it. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteMutation.mutate(schedule.id);
                    setDeleteOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}

function formatArchiveDate(isoDatetime: string) {
  return new Date(isoDatetime).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
