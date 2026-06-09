import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import {
  ResponsiveDrawer,
  ResponsiveDrawerClose,
  ResponsiveDrawerContent,
  ResponsiveDrawerDescription,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTitle,
} from '#/components/ui/responsive-drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Switch } from '#/components/ui/switch';
import type { BillWithSchedule } from '#/features/bills/bills-model';
import {
  useArchiveBill,
  useArchivedBillsCount,
  useBills,
  useCreateBill,
} from '#/features/bills/bills-queries';
import { usePaySchedules } from '#/features/pay-schedules/pay-schedules-queries';
import { cn } from '#/lib/utils';

const searchSchema = z.object({
  scheduleId: z
    .union([z.literal('all'), z.literal('unassigned'), z.string()])
    .catch('all'),
  manualOnly: z.boolean().catch(false),
});

export const Route = createFileRoute('/_authenticated/bills/')({
  validateSearch: searchSchema,
  component: BillManagementPage,
});

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function BillManagementPage() {
  const { scheduleId, manualOnly } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const billsQuery = useBills({ scheduleId, manualOnly });
  const schedulesQuery = usePaySchedules();
  const archivedCountQuery = useArchivedBillsCount();
  const archiveBillMutation = useArchiveBill();
  const createBillMutation = useCreateBill();

  const activeSchedules = (schedulesQuery.data ?? [])
    .filter(s => s.isActive)
    .sort((a, b) => a.anchorDay - b.anchorDay);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-chill-text">
          Bill Management
        </h1>
        <Button variant="primary" onClick={() => setDrawerOpen(true)}>
          + Add New Bill
        </Button>
      </div>

      <Card className="mb-4 overflow-visible">
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="w-56">
            <Select
              value={scheduleId}
              onValueChange={value =>
                navigate({ search: prev => ({ ...prev, scheduleId: value }) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schedules</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {activeSchedules.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="manual-only"
              checked={manualOnly}
              onCheckedChange={checked =>
                navigate({ search: prev => ({ ...prev, manualOnly: checked }) })
              }
            />
            <Label htmlFor="manual-only">Manual pay only</Label>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        {billsQuery.isLoading ? (
          <div className="px-6 py-10 text-center text-chill-text-muted text-sm">
            Loading...
          </div>
        ) : !billsQuery.data?.length ? (
          <div className="px-6 py-10 text-center text-chill-text-muted text-sm">
            No bills match these filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chill-border text-left">
                <th className="px-4 py-3 font-medium text-chill-text-muted w-14">
                  Day
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted">
                  Bill
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted">
                  Schedule
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted text-right">
                  Expected
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted text-center w-16">
                  Auto
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {billsQuery.data.map(bill => (
                <BillTableRow
                  key={bill.id}
                  bill={bill}
                  onArchive={() => archiveBillMutation.mutate(bill.id)}
                  onRowClick={() =>
                    navigate({
                      to: '/bills/$billId',
                      params: { billId: bill.id },
                      search: { edit: false },
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {!!archivedCountQuery.data && archivedCountQuery.data.count > 0 && (
        <p className="text-sm text-chill-text-muted">
          <Link
            to="/bills/archived"
            className="hover:text-chill-text underline underline-offset-2 transition-colors"
          >
            View Archived Bills ({archivedCountQuery.data.count}) →
          </Link>
        </p>
      )}

      <QuickAddDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={newBillId => {
          setDrawerOpen(false);
          navigate({
            to: '/bills/$billId',
            params: { billId: newBillId },
            search: { edit: true },
          });
        }}
        createBillMutation={createBillMutation}
      />
    </div>
  );
}

function BillTableRow({
  bill,
  onArchive,
  onRowClick,
}: {
  bill: BillWithSchedule;
  onArchive: () => void;
  onRowClick: () => void;
}) {
  return (
    <tr
      className="border-b border-chill-border last:border-0 hover:bg-chill-purple-light cursor-pointer transition-colors"
      onClick={onRowClick}
    >
      <td className="px-4 py-3 text-chill-text-muted tabular-nums">
        {bill.dueDayOfMonth}
      </td>
      <td className="px-4 py-3 font-medium">{bill.name}</td>
      <td className="px-4 py-3 text-chill-text-muted">
        <span>{bill.scheduleName ?? 'Unassigned'}</span>
        {bill.isOrphaned && (
          <Badge className="ml-2 bg-amber-100 text-amber-800 border border-amber-200">
            Inactive schedule
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatCurrency(bill.amountExpected)}
      </td>
      <td className="px-4 py-3 text-center">
        {bill.isAutoPay && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto text-chill-teal"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => e.stopPropagation()}
              aria-label={`Archive ${bill.name}`}
            >
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {bill.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone from this view.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.stopPropagation();
                  onArchive();
                }}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}

type QuickAddFormValues = {
  name: string;
  amountDollars: string;
  dueDayOfMonth: string;
};

function QuickAddDrawer({
  open,
  onOpenChange,
  onSuccess,
  createBillMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (billId: string) => void;
  createBillMutation: ReturnType<typeof useCreateBill>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddFormValues>();

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  async function onSubmit(values: QuickAddFormValues) {
    const amountCents = Math.round(parseFloat(values.amountDollars) * 100);
    const bill = await createBillMutation.mutateAsync({
      name: values.name,
      amountExpected: amountCents,
      dueDayOfMonth: parseInt(values.dueDayOfMonth, 10),
      isAutoPay: false,
    });
    onSuccess(bill.id);
  }

  return (
    <ResponsiveDrawer open={open} onOpenChange={onOpenChange}>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <div>
            <ResponsiveDrawerTitle>Add New Bill</ResponsiveDrawerTitle>
            <ResponsiveDrawerDescription>
              Fill in the basics. You can set more details after.
            </ResponsiveDrawerDescription>
          </div>
          <ResponsiveDrawerClose
            className={cn(
              'rounded-md p-1.5 text-chill-text-muted transition-colors',
              'hover:bg-chill-purple-light hover:text-chill-text',
              'focus:outline-none focus:ring-2 focus:ring-chill-teal',
            )}
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 4L4 14M4 4l10 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </ResponsiveDrawerClose>
        </ResponsiveDrawerHeader>

        <form
          id="quick-add-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bill-name">Name</Label>
            <Input
              id="bill-name"
              placeholder="e.g. Electricity"
              {...register('name', {
                required: 'Name is required',
                maxLength: {
                  value: 100,
                  message: 'Name must be 100 characters or fewer',
                },
              })}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bill-amount">Expected amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-chill-text-muted text-sm pointer-events-none">
                $
              </span>
              <Input
                id="bill-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="pl-7"
                {...register('amountDollars', {
                  required: 'Amount is required',
                  min: {
                    value: 0.01,
                    message: 'Amount must be greater than 0',
                  },
                })}
              />
            </div>
            {errors.amountDollars && (
              <p className="text-xs text-red-500">
                {errors.amountDollars.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bill-due-day">Due day of month</Label>
            <Input
              id="bill-due-day"
              type="number"
              min="1"
              max="31"
              placeholder="e.g. 15"
              {...register('dueDayOfMonth', {
                required: 'Due day is required',
                min: { value: 1, message: 'Must be between 1 and 31' },
                max: { value: 31, message: 'Must be between 1 and 31' },
              })}
            />
            {errors.dueDayOfMonth && (
              <p className="text-xs text-red-500">
                {errors.dueDayOfMonth.message}
              </p>
            )}
          </div>
        </form>

        <ResponsiveDrawerFooter>
          <ResponsiveDrawerClose asChild>
            <Button variant="default">Cancel</Button>
          </ResponsiveDrawerClose>
          <Button
            variant="primary"
            type="submit"
            form="quick-add-form"
            disabled={isSubmitting || createBillMutation.isPending}
          >
            {isSubmitting || createBillMutation.isPending
              ? 'Saving...'
              : 'Add Bill'}
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
