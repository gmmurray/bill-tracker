import { useRouterState } from '@tanstack/react-router';
import * as React from 'react';

export function RouterProgress() {
  const isLoading = useRouterState({ select: s => s.isLoading });
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-chill-purple-light"
      role="progressbar"
      aria-label="Loading"
    >
      <div className="h-full w-1/3 bg-chill-purple animate-router-progress" />
    </div>
  );
}
