import { useNavigate } from '@tanstack/react-router';
import { useBillActionsState } from '#/components/bill-actions-drawer';
import { Button } from '#/components/ui/button';

export function AttentionBanner() {
  const navigate = useNavigate();
  const { attentionCount } = useBillActionsState();

  if (attentionCount === 0) return null;

  return (
    <div className="bg-chill-peach border-b border-chill-peach-border border-l-4 border-l-chill-coral px-4 py-3 flex items-center gap-3">
      <span className="text-sm text-chill-text flex-1">
        {attentionCount} bill{attentionCount === 1 ? '' : 's'} need
        {attentionCount === 1 ? 's' : ''} your attention
      </span>
      <Button
        variant="default"
        size="sm"
        onClick={() =>
          navigate({ search: prev => ({ ...prev, actions: true }), to: '.' })
        }
      >
        Review →
      </Button>
    </div>
  );
}
