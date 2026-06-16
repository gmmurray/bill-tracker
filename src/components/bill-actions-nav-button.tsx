import { useNavigate } from '@tanstack/react-router';
import { FiCheckCircle } from 'react-icons/fi';
import { useBillActionsState } from '#/components/bill-actions-drawer';
import { cn } from '#/lib/utils';

type Props = {
  variant: 'sidebar' | 'topbar';
};

export function BillActionsNavButton({ variant }: Props) {
  const navigate = useNavigate();
  const { attentionCount } = useBillActionsState();

  const active = attentionCount > 0;

  function open() {
    navigate({ search: prev => ({ ...prev, actions: true }), to: '.' });
  }

  if (variant === 'topbar') {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Bill actions"
        className={cn(
          'p-1.5 rounded-md transition-colors',
          active
            ? 'bg-chill-peach text-chill-text hover:bg-chill-peach-border'
            : 'text-chill-text-muted hover:bg-chill-purple-light hover:text-chill-text',
        )}
      >
        <FiCheckCircle size={20} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2.5 transition-colors w-full',
        active
          ? 'bg-chill-peach text-chill-text hover:bg-chill-peach-border'
          : 'text-chill-text-muted hover:bg-chill-purple-light',
      )}
    >
      <FiCheckCircle size={16} />
      Actions
    </button>
  );
}
