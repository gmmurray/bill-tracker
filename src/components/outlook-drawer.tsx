import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { FiX } from 'react-icons/fi';
import { useBillOutlook } from '#/components/bill-outlook-provider';
import { OutlookList } from '#/components/outlook-list';
import {
  ResponsiveDrawer,
  ResponsiveDrawerClose,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTitle,
} from '#/components/ui/responsive-drawer';
import { formatCurrency } from '#/features/bills/bills-helpers';
import { cn } from '#/lib/utils';

/**
 * The app-wide action surface.
 *
 * Renders exactly what the dashboard renders — same derivation, same rows, same
 * grouping — so the two can never disagree about what is owed. The only
 * difference is that this one is reachable from every route.
 */
export function OutlookDrawer() {
  const { actions = false } = useSearch({ from: '__root__' });
  const navigate = useNavigate();
  const { outlook } = useBillOutlook();

  function close() {
    navigate({ search: prev => ({ ...prev, actions: false }), to: '.' });
  }

  return (
    <ResponsiveDrawer
      open={actions}
      onOpenChange={open => {
        if (!open) close();
      }}
    >
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader>
          <div className="flex flex-col gap-0.5">
            <ResponsiveDrawerTitle>Bill actions</ResponsiveDrawerTitle>
            <span className="text-xs text-chill-text-muted tabular-nums">
              {outlook.owed.count === 0
                ? 'Nothing owed through next month'
                : `${outlook.owed.count} owed · ${formatCurrency(outlook.owed.cents)}`}
            </span>
          </div>
          <ResponsiveDrawerClose
            className={cn(
              'rounded-md p-1.5 text-chill-text-muted transition-colors',
              'hover:bg-chill-purple-light hover:text-chill-text hover:cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-chill-teal',
            )}
            aria-label="Close"
          >
            <FiX size={18} aria-hidden="true" />
          </ResponsiveDrawerClose>
        </ResponsiveDrawerHeader>

        <div className="flex-1 overflow-auto flex flex-col">
          {outlook.cycles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <img
                src="/logo.png"
                alt=""
                className="h-20 w-20"
                aria-hidden="true"
              />
              <p className="text-lg font-semibold text-chill-text">
                You&apos;re chilling.
              </p>
              <p className="text-sm text-chill-text-muted">
                No bills to track yet.
              </p>
            </div>
          ) : (
            <OutlookList cycles={outlook.cycles} />
          )}

          <div className="px-6 py-4 border-t border-chill-border mt-auto">
            <Link
              to="/bills"
              search={{ scheduleId: 'all', manualOnly: false, actions: false }}
              className="text-sm text-chill-text-muted hover:text-chill-text transition-colors"
            >
              View all bills →
            </Link>
          </div>
        </div>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
