import { useNavigate } from '@tanstack/react-router';
import { LuSnowflake } from 'react-icons/lu';
import { useBillOutlook } from '#/components/bill-outlook-provider';
import { summarizeAttention } from '#/features/bills/bills-outlook';

export function OutlookNavButton() {
  const navigate = useNavigate();
  const { outlook } = useBillOutlook();
  const summary = summarizeAttention(outlook);

  const hasAttention = summary.count > 0;

  return (
    <button
      type="button"
      onClick={() =>
        navigate({ search: prev => ({ ...prev, actions: true }), to: '.' })
      }
      aria-label={
        hasAttention ? `Bill actions, ${summary.count} to pay` : 'Bill actions'
      }
      className="relative p-1 rounded-md text-chill-ice transition-colors hover:bg-chill-purple-light hover:cursor-pointer"
    >
      <LuSnowflake size={24} aria-hidden="true" />
      {hasAttention && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-chill-peach-border ring-2 ring-chill-surface"
        />
      )}
    </button>
  );
}
