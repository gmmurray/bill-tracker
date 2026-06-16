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
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import type { Bill } from '#/features/bills/bills-model';
import {
  archivedBillsCountQueryOptions,
  archivedBillsQueryOptions,
  useArchivedBills,
  useArchivedBillsCount,
  useDeleteBill,
  useRestoreBill,
} from '#/features/bills/bills-queries';

export const Route = createFileRoute('/_authenticated/bills/archived')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(archivedBillsQueryOptions()),
      context.queryClient.ensureQueryData(archivedBillsCountQueryOptions()),
    ]),
  component: BillsArchivePage,
});

function BillsArchivePage() {
  const archivedBillsQuery = useArchivedBills();
  const archivedCountQuery = useArchivedBillsCount();

  const count = archivedCountQuery.data?.count ?? 0;
  const bills = archivedBillsQuery.data ?? [];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          to="/bills"
          search={{ scheduleId: 'all', manualOnly: false }}
          className="text-sm text-chill-text-muted hover:text-chill-text transition-colors"
        >
          ← Back to Bills
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-chill-text">
          Archived Bills ({count})
        </h1>
      </div>

      <Card>
        {bills.length === 0 ? (
          <div className="px-6 py-10 text-center text-chill-text-muted text-sm">
            No archived bills.
          </div>
        ) : (
          <>
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-chill-border text-left">
                  <th className="px-4 py-3 font-medium text-chill-text-muted">
                    Bill Name
                  </th>
                  <th className="px-4 py-3 font-medium text-chill-text-muted w-28">
                    Due Day
                  </th>
                  <th className="px-4 py-3 font-medium text-chill-text-muted w-44">
                    Archived
                  </th>
                  <th className="px-4 py-3 w-36" />
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <ArchivedBillRow key={bill.id} bill={bill} />
                ))}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-chill-border">
              {bills.map(bill => (
                <ArchivedBillMobileCard key={bill.id} bill={bill} />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function ArchivedBillRow({ bill }: { bill: Bill }) {
  const restoreMutation = useRestoreBill();
  const deleteMutation = useDeleteBill();

  return (
    <tr className="border-b border-chill-border last:border-0">
      <td className="px-4 py-3 font-medium">{bill.name}</td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatOrdinal(bill.dueDayOfMonth)}
      </td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatArchiveDate(bill.updatedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="default"
            size="sm"
            disabled={restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(bill.id)}
          >
            Restore
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Permanently delete {bill.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will also delete all of its payment history. This cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(bill.id)}
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

function ArchivedBillMobileCard({ bill }: { bill: Bill }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const restoreMutation = useRestoreBill();
  const deleteMutation = useDeleteBill();

  return (
    <li className="px-4 py-4">
      <p className="font-medium text-chill-text">{bill.name}</p>
      <p className="text-xs text-chill-text-muted mt-0.5">
        Due {formatOrdinal(bill.dueDayOfMonth)} · Archived{' '}
        {formatArchiveDate(bill.updatedAt)}
      </p>
      <div className="mt-2 flex justify-end gap-1">
        <Button
          variant="default"
          size="sm"
          disabled={restoreMutation.isPending}
          onClick={() => restoreMutation.mutate(bill.id)}
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
                Permanently delete {bill.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will also delete all of its payment history. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteMutation.mutate(bill.id);
                  setDeleteOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
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
