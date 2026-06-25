import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { FiMoreVertical, FiX } from 'react-icons/fi';
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
import { Card, CardBody, CardFooter, CardHeader } from '#/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
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
import { Switch } from '#/components/ui/switch';
import { formatCurrency, formatOrdinal } from '#/features/bills/bills-helpers';
import type { BillWithSchedule } from '#/features/bills/bills-model';
import {
  billsQueryOptions,
  useBills,
  useBulkAssignBills,
  useUpdateBill,
} from '#/features/bills/bills-queries';
import type { PaySchedule } from '#/features/pay-schedules/pay-schedules-model';
import {
  archivedPaySchedulesCountQueryOptions,
  paySchedulesQueryOptions,
  useArchivedPaySchedulesCount,
  useArchivePaySchedule,
  useCreatePaySchedule,
  usePaySchedules,
  useUpdatePaySchedule,
} from '#/features/pay-schedules/pay-schedules-queries';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/_authenticated/schedules/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(paySchedulesQueryOptions()),
      context.queryClient.ensureQueryData(
        billsQueryOptions({ scheduleId: 'all', manualOnly: false }),
      ),
      context.queryClient.ensureQueryData(
        archivedPaySchedulesCountQueryOptions(),
      ),
    ]),
  component: SchedulesPage,
});

const DotsButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label="Open menu"
    className={cn(
      'rounded p-1 hover:bg-chill-purple-light text-chill-text-muted',
      className,
    )}
    {...props}
  >
    <FiMoreVertical size={16} aria-hidden="true" />
  </button>
));
DotsButton.displayName = 'DotsButton';

function SchedulesPage() {
  const [createOpen, setCreateOpen] = React.useState(false);

  const schedulesQuery = usePaySchedules();
  const billsQuery = useBills({ scheduleId: 'all', manualOnly: false });
  const archivedCountQuery = useArchivedPaySchedulesCount();

  const schedules = (schedulesQuery.data ?? []).sort(
    (a, b) => a.payDate - b.payDate,
  );
  const bills = billsQuery.data ?? [];
  const archivedCount = archivedCountQuery.data?.count ?? 0;

  const billMap = React.useMemo(() => {
    const map = new Map<string | 'unassigned', BillWithSchedule[]>();
    for (const bill of bills) {
      const key =
        bill.payScheduleId === null || bill.isOrphaned
          ? 'unassigned'
          : bill.payScheduleId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bill);
    }
    for (const [key, list] of map) {
      map.set(
        key,
        list.sort((a, b) => a.dueDayOfMonth - b.dueDayOfMonth),
      );
    }
    return map;
  }, [bills]);

  const unassigned = billMap.get('unassigned') ?? [];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-chill-text">
          Pay Schedules
        </h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + New Schedule
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {schedules.map(schedule => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            bills={billMap.get(schedule.id) ?? []}
            allSchedules={schedules}
          />
        ))}

        {unassigned.length > 0 && (
          <UnassignedCard bills={unassigned} allSchedules={schedules} />
        )}
      </div>

      {archivedCount > 0 && (
        <p className="mt-6 text-sm text-chill-text-muted">
          <Link
            to="/schedules/archived"
            className="hover:text-chill-text underline underline-offset-2 transition-colors"
          >
            View Archived Schedules ({archivedCount}) →
          </Link>
        </p>
      )}

      <ScheduleFormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
    </div>
  );
}

function ScheduleCard({
  schedule,
  bills,
  allSchedules,
}: {
  schedule: PaySchedule;
  bills: BillWithSchedule[];
  allSchedules: PaySchedule[];
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);

  const archiveMutation = useArchivePaySchedule();

  const total = bills.reduce((sum, b) => sum + b.amountExpected, 0);
  const otherSchedules = allSchedules.filter(s => s.id !== schedule.id);

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <p className="font-semibold text-chill-text">{schedule.name}</p>
            <p className="text-sm text-chill-text-muted mt-0.5">
              Pay on {formatOrdinal(schedule.payDate)} of every month
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-chill-text tabular-nums">
              {formatCurrency(total)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DotsButton />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardBody>
          {bills.length === 0 ? (
            <p className="px-6 py-4 text-sm text-chill-text-muted">
              No bills assigned.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {bills.map(bill => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    otherSchedules={otherSchedules}
                  />
                ))}
              </tbody>
            </table>
          )}

          <div className="px-6 py-3 border-t border-chill-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              + Assign Bills
            </Button>
          </div>
        </CardBody>

        <CardFooter>
          <p className="text-sm text-chill-text-muted">
            Total:{' '}
            <span className="font-medium text-chill-text tabular-nums">
              {formatCurrency(total)}
            </span>
          </p>
        </CardFooter>
      </Card>

      <ScheduleFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        schedule={schedule}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {schedule.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Bills assigned to this schedule will move into the Unassigned pool
              until reassigned. No data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                archiveMutation.mutate(schedule.id);
                setArchiveOpen(false);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkAssignDrawer
        open={assignOpen}
        onOpenChange={setAssignOpen}
        schedule={schedule}
      />
    </>
  );
}

function BillRow({
  bill,
  otherSchedules,
}: {
  bill: BillWithSchedule;
  otherSchedules: PaySchedule[];
}) {
  const navigate = useNavigate();
  const updateBillMutation = useUpdateBill();

  return (
    <tr className="border-b border-chill-border last:border-0">
      <td className="px-6 py-3 font-medium">{bill.name}</td>
      <td className="px-4 py-3 text-chill-text-muted w-24">
        {formatOrdinal(bill.dueDayOfMonth)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums w-28">
        {formatCurrency(bill.amountExpected)}
      </td>
      <td className="px-4 py-3 text-right w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <DotsButton />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() =>
                navigate({
                  to: '/bills/$billId',
                  params: { billId: bill.id },
                  search: { edit: false, page: 1 },
                })
              }
            >
              Open bill
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {otherSchedules.map(s => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() =>
                      updateBillMutation.mutate({
                        id: bill.id,
                        payScheduleId: s.id,
                      })
                    }
                  >
                    {s.name}
                  </DropdownMenuItem>
                ))}
                {otherSchedules.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onSelect={() =>
                    updateBillMutation.mutate({
                      id: bill.id,
                      payScheduleId: null,
                    })
                  }
                >
                  Unassigned
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function UnassignedCard({
  bills,
  allSchedules,
}: {
  bills: BillWithSchedule[];
  allSchedules: PaySchedule[];
}) {
  const navigate = useNavigate();
  const updateBillMutation = useUpdateBill();

  return (
    <Card>
      <CardHeader>
        <p className="font-semibold text-chill-text">
          Unassigned Bills ({bills.length})
        </p>
      </CardHeader>

      <CardBody>
        <table className="w-full text-sm">
          <tbody>
            {bills.map(bill => (
              <tr
                key={bill.id}
                className="border-b border-chill-border last:border-0"
              >
                <td className="px-6 py-3 font-medium">{bill.name}</td>
                <td className="px-4 py-3 text-chill-text-muted w-24">
                  {formatOrdinal(bill.dueDayOfMonth)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums w-28">
                  {formatCurrency(bill.amountExpected)}
                </td>
                <td className="px-4 py-3 text-right w-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <DotsButton />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          navigate({
                            to: '/bills/$billId',
                            params: { billId: bill.id },
                            search: { edit: false, page: 1 },
                          })
                        }
                      >
                        Open bill
                      </DropdownMenuItem>
                      {allSchedules.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {allSchedules.map(s => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onSelect={() =>
                                    updateBillMutation.mutate({
                                      id: bill.id,
                                      payScheduleId: s.id,
                                    })
                                  }
                                >
                                  {s.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

type ScheduleFormValues = {
  name: string;
  payDate: string;
};

function ScheduleFormDrawer({
  open,
  onOpenChange,
  mode,
  schedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  schedule?: PaySchedule;
}) {
  const createMutation = useCreatePaySchedule();
  const updateMutation = useUpdatePaySchedule();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormValues>({
    defaultValues: {
      name: schedule?.name ?? '',
      payDate: schedule ? String(schedule.payDate) : '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: schedule?.name ?? '',
        payDate: schedule ? String(schedule.payDate) : '',
      });
    }
  }, [open, schedule, reset]);

  async function onSubmit(values: ScheduleFormValues) {
    const payDate = parseInt(values.payDate, 10);
    if (mode === 'create') {
      await createMutation.mutateAsync({ name: values.name, payDate });
    } else if (schedule) {
      await updateMutation.mutateAsync({
        id: schedule.id,
        name: values.name,
        payDate,
      });
    }
    onOpenChange(false);
  }

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <ResponsiveDrawer open={open} onOpenChange={onOpenChange}>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <div>
            <ResponsiveDrawerTitle>
              {mode === 'create' ? 'New Schedule' : 'Edit Schedule'}
            </ResponsiveDrawerTitle>
            <ResponsiveDrawerDescription>
              {mode === 'create'
                ? 'Create a new pay schedule to group bills.'
                : "Update this schedule's name or pay date."}
            </ResponsiveDrawerDescription>
          </div>
          <ResponsiveDrawerClose
            className={cn(
              'rounded-md p-1.5 text-chill-text-muted transition-colors',
              'hover:bg-chill-purple-light hover:text-chill-text',
              'focus:outline-none focus:ring-2 focus:ring-chill-purple',
            )}
            aria-label="Close"
          >
            <FiX size={18} aria-hidden="true" />
          </ResponsiveDrawerClose>
        </ResponsiveDrawerHeader>

        <form
          id="schedule-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              placeholder="e.g. First of Month"
              {...register('name', {
                required: 'Name is required',
                maxLength: {
                  value: 100,
                  message: 'Name must be 100 characters or fewer',
                },
              })}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-pay-date">Pay date</Label>
            <p className="text-xs text-chill-text-muted -mt-0.5">
              The day of the month you settle this group of bills.
            </p>
            <Input
              id="schedule-pay-date"
              type="number"
              min="1"
              max="31"
              placeholder="e.g. 1"
              {...register('payDate', {
                required: 'Pay date is required',
                min: { value: 1, message: 'Must be between 1 and 31' },
                max: { value: 31, message: 'Must be between 1 and 31' },
              })}
            />
            {errors.payDate && (
              <p className="text-sm text-red-600">{errors.payDate.message}</p>
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
            form="schedule-form"
            disabled={isPending}
          >
            {isPending ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

function BulkAssignDrawer({
  open,
  onOpenChange,
  schedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: PaySchedule;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const billsQuery = useBills({ scheduleId: 'all', manualOnly: false });
  const bulkAssignMutation = useBulkAssignBills();

  const allBills = billsQuery.data ?? [];

  const candidates = React.useMemo(() => {
    const filtered = showAll
      ? allBills.filter(b => b.payScheduleId !== schedule.id)
      : allBills.filter(b => b.payScheduleId === null || b.isOrphaned);
    return filtered.sort((a, b) => a.dueDayOfMonth - b.dueDayOfMonth);
  }, [allBills, showAll, schedule.id]);

  React.useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setShowAll(false);
    }
  }, [open]);

  function toggleBill(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    await bulkAssignMutation.mutateAsync({
      scheduleId: schedule.id,
      billIds: Array.from(selected),
    });
    onOpenChange(false);
  }

  const selectedCount = selected.size;

  return (
    <ResponsiveDrawer open={open} onOpenChange={onOpenChange}>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <div>
            <ResponsiveDrawerTitle>
              Assign bills to {schedule.name}
            </ResponsiveDrawerTitle>
          </div>
          <ResponsiveDrawerClose
            className={cn(
              'rounded-md p-1.5 text-chill-text-muted transition-colors',
              'hover:bg-chill-purple-light hover:text-chill-text',
              'focus:outline-none focus:ring-2 focus:ring-chill-purple',
            )}
            aria-label="Close"
          >
            <FiX size={18} aria-hidden="true" />
          </ResponsiveDrawerClose>
        </ResponsiveDrawerHeader>

        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-all-bills"
              checked={showAll}
              onCheckedChange={checked => {
                setShowAll(checked);
                setSelected(new Set());
              }}
            />
            <Label htmlFor="show-all-bills">Show all bills</Label>
          </div>

          {candidates.length === 0 ? (
            <p className="text-sm text-chill-text-muted">
              No bills available to assign.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {candidates.map(bill => (
                <label
                  key={bill.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-chill-purple-light cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-chill-border accent-chill-purple"
                    checked={selected.has(bill.id)}
                    onChange={() => toggleBill(bill.id)}
                  />
                  <span className="flex-1 text-sm font-medium text-chill-text">
                    {bill.name}
                  </span>
                  <span className="text-sm text-chill-text-muted">
                    {formatOrdinal(bill.dueDayOfMonth)}
                  </span>
                  <span className="text-sm tabular-nums text-chill-text-muted w-20 text-right">
                    {formatCurrency(bill.amountExpected)}
                  </span>
                  {showAll && bill.scheduleName && !bill.isOrphaned && (
                    <span className="text-xs text-chill-text-muted ml-1">
                      {bill.scheduleName}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <ResponsiveDrawerFooter>
          <ResponsiveDrawerClose asChild>
            <Button variant="default">Cancel</Button>
          </ResponsiveDrawerClose>
          <Button
            variant="primary"
            disabled={selectedCount === 0 || bulkAssignMutation.isPending}
            onClick={handleAssign}
          >
            {bulkAssignMutation.isPending
              ? 'Assigning...'
              : `Assign ${selectedCount} bill${selectedCount !== 1 ? 's' : ''}`}
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
