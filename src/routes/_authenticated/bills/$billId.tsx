import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FiX } from 'react-icons/fi';
import { z } from 'zod';
import { PayBillDialog } from '#/components/pay-bill-dialog';
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
import { Card, CardBody, CardFooter, CardHeader } from '#/components/ui/card';
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
import { formatCurrency } from '#/features/bills/bills-helpers';
import type { BillDetail, BillInstance } from '#/features/bills/bills-model';
import {
  billDetailQueryOptions,
  useArchiveBill,
  useBillDetail,
  useDeleteBillInstance,
  useLogHistoricalPayment,
  useUpdateBill,
  useUpdateBillInstance,
} from '#/features/bills/bills-queries';
import { usePaySchedules } from '#/features/pay-schedules/pay-schedules-queries';
import { cn } from '#/lib/utils';

const searchSchema = z.object({
  edit: z.boolean().catch(false),
  page: z.number().int().positive().catch(1),
});

export const Route = createFileRoute('/_authenticated/bills/$billId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      billDetailQueryOptions(params.billId, deps.page, 10),
    ),
  component: BillDetailPage,
});

function formatDueDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPaidAt(isoDatetime: string) {
  return new Date(isoDatetime).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BillDetailPage() {
  const { billId } = Route.useParams();
  const { edit, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const archiveBillMutation = useArchiveBill();
  const [logDrawerOpen, setLogDrawerOpen] = React.useState(false);
  const [payNowOpen, setPayNowOpen] = React.useState(false);

  const billDetailQuery = useBillDetail(billId, page, 10);

  if (billDetailQuery.isError || !billDetailQuery.data) {
    return (
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <div className="py-20 text-center text-sm text-red-500">
          Failed to load bill.
        </div>
      </div>
    );
  }

  const bill = billDetailQuery.data;

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

      <BlueprintSection
        bill={bill}
        isEditing={edit}
        onEdit={() => navigate({ search: prev => ({ ...prev, edit: true }) })}
        onCancelEdit={() =>
          navigate({ search: prev => ({ ...prev, edit: false }) })
        }
        onSavedEdit={() =>
          navigate({ search: prev => ({ ...prev, edit: false }) })
        }
        onArchive={async () => {
          await archiveBillMutation.mutateAsync(bill.id);
          navigate({
            to: '/bills',
            search: { scheduleId: 'all', manualOnly: false },
          });
        }}
      />

      <div className="mt-6">
        <LedgerSection
          bill={bill}
          page={page}
          onPageChange={newPage =>
            navigate({ search: prev => ({ ...prev, page: newPage }) })
          }
          onLogHistoricalPayment={() => setLogDrawerOpen(true)}
          onPayNow={() => setPayNowOpen(true)}
        />
      </div>

      <LogHistoricalPaymentDrawer
        billId={billId}
        open={logDrawerOpen}
        onOpenChange={setLogDrawerOpen}
      />

      <PayBillDialog
        bill={bill}
        instances={bill.instances}
        open={payNowOpen}
        onOpenChange={setPayNowOpen}
      />
    </div>
  );
}

// --- Blueprint Section ---

type EditBillFormValues = {
  name: string;
  amountDollars: string;
  dueDayOfMonth: string;
  payScheduleId: string;
  paymentUrl: string;
  isAutoPay: boolean;
  notes: string;
};

function BlueprintSection({
  bill,
  isEditing,
  onEdit,
  onCancelEdit,
  onSavedEdit,
  onArchive,
}: {
  bill: BillDetail;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSavedEdit: () => void;
  onArchive: () => void;
}) {
  const updateBillMutation = useUpdateBill();
  const schedulesQuery = usePaySchedules();
  const activeSchedules = (schedulesQuery.data ?? []).filter(s => s.isActive);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditBillFormValues>({
    defaultValues: {
      name: '',
      amountDollars: '',
      dueDayOfMonth: '',
      payScheduleId: 'none',
      paymentUrl: '',
      isAutoPay: false,
      notes: '',
    },
  });

  React.useEffect(() => {
    reset({
      name: bill.name,
      amountDollars: (bill.amountExpected / 100).toFixed(2),
      dueDayOfMonth: String(bill.dueDayOfMonth),
      payScheduleId: bill.payScheduleId ?? 'none',
      paymentUrl: bill.paymentUrl ?? '',
      isAutoPay: bill.isAutoPay,
      notes: bill.notes ?? '',
    });
  }, [bill, reset]);

  async function onSubmit(values: EditBillFormValues) {
    await updateBillMutation.mutateAsync({
      id: bill.id,
      name: values.name,
      amountExpected: Math.round(parseFloat(values.amountDollars) * 100),
      dueDayOfMonth: parseInt(values.dueDayOfMonth, 10),
      payScheduleId:
        values.payScheduleId === 'none' ? null : values.payScheduleId,
      paymentUrl:
        values.paymentUrl.trim() === '' ? null : values.paymentUrl.trim(),
      isAutoPay: values.isAutoPay,
      notes: values.notes.trim() === '' ? null : values.notes.trim(),
    });
    onSavedEdit();
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-chill-text">
          Bill Details
        </h2>
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button variant="default" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
                  <AlertDialogAction onClick={onArchive}>
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>

      {isEditing ? (
        <form id="edit-bill-form" onSubmit={handleSubmit(onSubmit)}>
          <CardBody className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-name">Name</Label>
              <Input
                id="bill-name"
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-schedule">Pay schedule</Label>
              <Controller
                control={control}
                name="payScheduleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bill-schedule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {activeSchedules.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-chill-text-muted">
                A budgeting group, not a deadline. You can always pay early.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-payment-url">Payment URL</Label>
              <Input
                id="bill-payment-url"
                type="url"
                placeholder="https://..."
                {...register('paymentUrl')}
              />
              {errors.paymentUrl && (
                <p className="text-xs text-red-500">
                  {errors.paymentUrl.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-auto-pay">Auto-pay</Label>
              <div className="flex items-center gap-2 h-9">
                <Controller
                  control={control}
                  name="isAutoPay"
                  render={({ field }) => (
                    <Switch
                      id="bill-auto-pay"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <p className="text-xs text-chill-text-muted">
                Just a label — auto-pay bills still need a payment record to
                count.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="bill-notes">Notes</Label>
              <textarea
                id="bill-notes"
                maxLength={500}
                rows={3}
                className={cn(
                  'w-full rounded border border-chill-border bg-chill-surface px-3 py-2 text-sm text-chill-text',
                  'placeholder:text-chill-text-muted resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-chill-teal focus:border-transparent',
                )}
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-xs text-red-500">{errors.notes.message}</p>
              )}
            </div>
          </CardBody>

          <CardFooter className="flex justify-end gap-2">
            <Button variant="default" type="button" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting || updateBillMutation.isPending}
            >
              {isSubmitting || updateBillMutation.isPending
                ? 'Saving...'
                : 'Save'}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <CardBody className="px-6 py-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <DetailField label="Name" value={bill.name} />
            <DetailField
              label="Expected amount"
              value={formatCurrency(bill.amountExpected)}
            />
            <DetailField
              label="Due day of month"
              value={String(bill.dueDayOfMonth)}
            />
            <div>
              <p className="text-xs font-medium text-chill-text-muted uppercase tracking-wide mb-1">
                Schedule
              </p>
              <p className="text-sm text-chill-text">
                {bill.isOrphaned ? (
                  <span className="text-amber-700">
                    {bill.scheduleName} (inactive)
                  </span>
                ) : (
                  (bill.scheduleName ?? 'Unassigned')
                )}
              </p>
            </div>
            <DetailField
              label="Auto-pay"
              value={bill.isAutoPay ? 'Yes' : 'No'}
            />
            <div>
              <p className="text-xs font-medium text-chill-text-muted uppercase tracking-wide mb-1">
                Payment URL
              </p>
              {bill.paymentUrl ? (
                <a
                  href={bill.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-chill-teal hover:underline break-all"
                >
                  {bill.paymentUrl}
                </a>
              ) : (
                <p className="text-sm text-chill-text-muted">—</p>
              )}
            </div>
          </div>
          <div className="mt-5">
            <p className="text-xs font-medium text-chill-text-muted uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-sm text-chill-text whitespace-pre-wrap">
              {bill.notes || '—'}
            </p>
          </div>
        </CardBody>
      )}
    </Card>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-chill-text-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-chill-text">{value}</p>
    </div>
  );
}

// --- Ledger Section ---

const LEDGER_PAGE_SIZE = 10;

function LedgerSection({
  bill,
  page,
  onPageChange,
  onLogHistoricalPayment,
  onPayNow,
}: {
  bill: BillDetail;
  page: number;
  onPageChange: (page: number) => void;
  onLogHistoricalPayment: () => void;
  onPayNow: () => void;
}) {
  const totalPages = Math.max(
    1,
    Math.ceil(bill.instancesTotal / LEDGER_PAGE_SIZE),
  );
  const [editInstance, setEditInstance] = React.useState<BillInstance | null>(
    null,
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-chill-text">
          Payment History
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={onLogHistoricalPayment}>
            + Log Historical Payment
          </Button>
          <Button variant="pay" size="sm" onClick={onPayNow}>
            Mark Paid
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        {bill.instances.length === 0 ? (
          <div className="py-10 text-center text-chill-text-muted text-sm">
            No payments recorded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chill-border text-left">
                <th className="px-4 py-3 font-medium text-chill-text-muted">
                  Cycle Due Date
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted">
                  Date Paid
                </th>
                <th className="px-4 py-3 font-medium text-chill-text-muted text-right">
                  Amount Paid
                </th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {bill.instances.map(instance => (
                <LedgerRow
                  key={instance.id}
                  instance={instance}
                  billId={bill.id}
                  onEditAmount={() => setEditInstance(instance)}
                />
              ))}
            </tbody>
          </table>
        )}
      </CardBody>

      <CardFooter className="flex items-center justify-between">
        <Button
          variant="default"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Previous
        </Button>
        <span className="text-sm text-chill-text-muted">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="default"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </Button>
      </CardFooter>

      <EditAmountDrawer
        instance={editInstance}
        billId={bill.id}
        onClose={() => setEditInstance(null)}
      />
    </Card>
  );
}

function LedgerRow({
  instance,
  billId,
  onEditAmount,
}: {
  instance: BillInstance;
  billId: string;
  onEditAmount: () => void;
}) {
  const deleteMutation = useDeleteBillInstance();

  return (
    <tr className="border-b border-chill-border last:border-0">
      <td className="px-4 py-3">{formatDueDate(instance.dueDate)}</td>
      <td className="px-4 py-3 text-chill-text-muted">
        {formatPaidAt(instance.paidAt)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatCurrency(instance.amountActual)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEditAmount}>
            Edit
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
                <AlertDialogTitle>Delete this payment record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteMutation.mutate({ instanceId: instance.id, billId })
                  }
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

// --- Edit Amount Drawer ---

type EditAmountFormValues = { amountDollars: string };

function EditAmountDrawer({
  instance,
  billId,
  onClose,
}: {
  instance: BillInstance | null;
  billId: string;
  onClose: () => void;
}) {
  const updateMutation = useUpdateBillInstance();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditAmountFormValues>();

  React.useEffect(() => {
    if (instance) {
      reset({ amountDollars: (instance.amountActual / 100).toFixed(2) });
    }
  }, [instance, reset]);

  async function onSubmit(values: EditAmountFormValues) {
    if (!instance) return;
    await updateMutation.mutateAsync({
      instanceId: instance.id,
      amountActual: Math.round(parseFloat(values.amountDollars) * 100),
      billId,
    });
    onClose();
  }

  return (
    <ResponsiveDrawer
      open={instance !== null}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <div>
            <ResponsiveDrawerTitle>Edit Payment Amount</ResponsiveDrawerTitle>
            {instance && (
              <ResponsiveDrawerDescription>
                Cycle: {formatDueDate(instance.dueDate)}
              </ResponsiveDrawerDescription>
            )}
          </div>
          <ResponsiveDrawerClose
            className={cn(
              'rounded-md p-1.5 text-chill-text-muted transition-colors',
              'hover:bg-chill-purple-light hover:text-chill-text',
              'focus:outline-none focus:ring-2 focus:ring-chill-teal',
            )}
            aria-label="Close"
          >
            <FiX size={18} aria-hidden="true" />
          </ResponsiveDrawerClose>
        </ResponsiveDrawerHeader>

        <form
          id="edit-amount-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount">Amount paid</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-chill-text-muted text-sm pointer-events-none">
                $
              </span>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
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
        </form>

        <ResponsiveDrawerFooter>
          <ResponsiveDrawerClose asChild>
            <Button variant="default" type="button" onClick={onClose}>
              Cancel
            </Button>
          </ResponsiveDrawerClose>
          <Button
            variant="primary"
            type="submit"
            form="edit-amount-form"
            disabled={isSubmitting || updateMutation.isPending}
          >
            {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

// --- Log Historical Payment Drawer ---

type LogPaymentFormValues = {
  dueDate: string;
  amountDollars: string;
  paidAt: string;
};

function LogHistoricalPaymentDrawer({
  billId,
  open,
  onOpenChange,
}: {
  billId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const logMutation = useLogHistoricalPayment();
  const todayISO = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LogPaymentFormValues>();

  React.useEffect(() => {
    if (open) {
      const now = new Date();
      const localPadded = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
      reset({ dueDate: '', amountDollars: '', paidAt: localPadded });
    }
  }, [open, reset]);

  async function onSubmit(values: LogPaymentFormValues) {
    try {
      await logMutation.mutateAsync({
        billId,
        dueDate: values.dueDate,
        amountActual: Math.round(parseFloat(values.amountDollars) * 100),
        paidAt: new Date(values.paidAt).toISOString(),
      });
      onOpenChange(false);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  }

  return (
    <ResponsiveDrawer open={open} onOpenChange={onOpenChange}>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <div>
            <ResponsiveDrawerTitle>
              Log Historical Payment
            </ResponsiveDrawerTitle>
            <ResponsiveDrawerDescription>
              Back-fill a payment record for a past cycle.
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
            <FiX size={18} aria-hidden="true" />
          </ResponsiveDrawerClose>
        </ResponsiveDrawerHeader>

        <form
          id="log-payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-due-date">Cycle due date</Label>
            <Input
              id="log-due-date"
              type="date"
              max={todayISO}
              {...register('dueDate', {
                required: 'Cycle due date is required',
              })}
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500">{errors.dueDate.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-amount">Amount paid</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-chill-text-muted text-sm pointer-events-none">
                $
              </span>
              <Input
                id="log-amount"
                type="number"
                step="0.01"
                min="0.01"
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
            <Label htmlFor="log-paid-at">Date paid</Label>
            <Input
              id="log-paid-at"
              type="datetime-local"
              {...register('paidAt', { required: 'Date paid is required' })}
            />
            {errors.paidAt && (
              <p className="text-xs text-red-500">{errors.paidAt.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-red-500 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              {errors.root.message}
            </p>
          )}
        </form>

        <ResponsiveDrawerFooter>
          <ResponsiveDrawerClose asChild>
            <Button variant="default" type="button">
              Cancel
            </Button>
          </ResponsiveDrawerClose>
          <Button
            variant="primary"
            type="submit"
            form="log-payment-form"
            disabled={isSubmitting || logMutation.isPending}
          >
            {isSubmitting || logMutation.isPending
              ? 'Saving...'
              : 'Log Payment'}
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
