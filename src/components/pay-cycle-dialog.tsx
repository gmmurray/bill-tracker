import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import type { BillCycle } from '#/features/bills/bills-outlook';
import { useRecordBillPayment } from '#/features/bills/bills-queries';
import { getErrorMessage } from '#/lib/utils';

type FormValues = { amountDollars: string };

export function formatCycleDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Records a payment against one explicit cycle.
 *
 * The cycle comes from the row the user clicked, and is sent to the server
 * verbatim — nothing is inferred at confirm time. The predecessor recomputed
 * "nearest unpaid" from a partial client-side ledger, which could name a cycle
 * the server would not actually write.
 */
export function PayCycleDialog({
  cycle,
  open,
  onOpenChange,
}: {
  cycle: BillCycle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordPayment = useRecordBillPayment();
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      amountDollars: (cycle.bill.amountExpected / 100).toFixed(2),
    },
  });

  React.useEffect(() => {
    if (open) {
      setConflictError(null);
      reset({ amountDollars: (cycle.bill.amountExpected / 100).toFixed(2) });
    }
  }, [open, cycle.bill.amountExpected, reset]);

  async function onSubmit(values: FormValues) {
    setConflictError(null);
    try {
      await recordPayment.mutateAsync({
        billId: cycle.bill.id,
        amountActual: Math.round(parseFloat(values.amountDollars) * 100),
        dueDate: cycle.cycleDueDate,
      });
      onOpenChange(false);
    } catch (err) {
      setConflictError(getErrorMessage(err, 'Failed to record payment'));
    }
  }

  const scheduled = cycle.payByDate !== cycle.cycleDueDate;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {cycle.bill.name} as paid</AlertDialogTitle>
          <AlertDialogDescription>
            This records one billing cycle. Confirm it&apos;s the right one.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          id="pay-cycle-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-2"
        >
          <div className="rounded-lg border border-chill-border bg-chill-bg px-4 py-3 flex flex-col gap-1 text-sm">
            <p className="text-chill-text-muted">
              Cycle:{' '}
              <span className="font-medium text-chill-text">
                {formatCycleDate(cycle.cycleDueDate)}
              </span>
            </p>
            {scheduled && (
              <p className="text-chill-text-muted">
                Pay date:{' '}
                <span className="font-medium text-chill-text">
                  {formatCycleDate(cycle.payByDate)}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-cycle-amount">Amount paid</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-chill-text-muted text-sm pointer-events-none">
                $
              </span>
              <Input
                id="pay-cycle-amount"
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

          {conflictError && (
            <p className="text-sm text-red-500 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              {conflictError}
            </p>
          )}
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="pay"
            type="submit"
            form="pay-cycle-form"
            disabled={isSubmitting || recordPayment.isPending}
          >
            {isSubmitting || recordPayment.isPending
              ? 'Recording...'
              : 'Confirm payment'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
