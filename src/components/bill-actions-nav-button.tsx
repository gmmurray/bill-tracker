import { useNavigate } from '@tanstack/react-router';
import { FiCheckCircle } from 'react-icons/fi';
import { useBillActionsState } from '#/components/bill-actions-drawer';
import { cn } from '#/lib/utils';

export function BillActionsNavButton() {
  const navigate = useNavigate();
  const { attentionCount } = useBillActionsState();

  const active = attentionCount > 0;

  function open() {
    navigate({ search: prev => ({ ...prev, actions: true }), to: '.' });
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Bill actions"
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-chill-peach text-chill-text hover:bg-chill-peach-border hover:cursor-pointer'
          : 'text-chill-text-muted hover:bg-chill-purple-light hover:text-chill-text',
      )}
    >
      <FiCheckCircle size={20} />
    </button>
  );
}
