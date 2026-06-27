import { useNavigate } from '@tanstack/react-router';
import { LuSnowflake } from 'react-icons/lu';
import { useBillActionsState } from '#/components/bill-actions-drawer';

export function BillActionsNavButton() {
  const navigate = useNavigate();
  const { attentionCount } = useBillActionsState();

  const hasAttention = attentionCount > 0;

  function open() {
    navigate({ search: prev => ({ ...prev, actions: true }), to: '.' });
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label={
        hasAttention
          ? `Bill actions, ${attentionCount} needing attention`
          : 'Bill actions'
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
