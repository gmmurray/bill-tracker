import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { computeNearestUnpaidDueDate } from '#/features/bills/bills-helpers';
import type { Bill, BillInstance } from '#/features/bills/bills-model';
import { useRecordBillPayment } from '#/features/bills/bills-queries';
import { getErrorMessage } from '#/lib/utils';

type Props = {
  bill: Pick<Bill, 'id' | 'name' | 'dueDayOfMonth' | 'amountExpected'>;
  instances: BillInstance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormValues = { amountDollars: string };

function formatDueDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PayBillDialog({ bill, instances, open, onOpenChange }: Props) {
  const recordPayment = useRecordBillPayment();
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  const targetDueDate = React.useMemo(
    () =>
      computeNearestUnpaidDueDate(bill.dueDayOfMonth, instances, new Date()),
    [bill.dueDayOfMonth, instances],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { amountDollars: (bill.amountExpected / 100).toFixed(2) },
  });

  React.useEffect(() => {
    if (open) {
      setConflictError(null);
      reset({ amountDollars: (bill.amountExpected / 100).toFixed(2) });
    }
  }, [open, bill.amountExpected, reset]);

  async function onSubmit(values: FormValues) {
    setConflictError(null);
    try {
      await recordPayment.mutateAsync({
        billId: bill.id,
        amountActual: Math.round(parseFloat(values.amountDollars) * 100),
      });
      onOpenChange(false);
    } catch (err) {
      setConflictError(getErrorMessage(err, 'Failed to record payment'));
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {bill.name} as paid</AlertDialogTitle>
        </AlertDialogHeader>

        <form
          id="pay-bill-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-2"
        >
          <p className="text-sm text-chill-text-muted">
            Applying to:{' '}
            <span className="font-medium text-chill-text">
              {formatDueDate(targetDueDate)}
            </span>
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">Amount paid</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-chill-text-muted text-sm pointer-events-none">
                $
              </span>
              <Input
                id="pay-amount"
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
            form="pay-bill-form"
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
