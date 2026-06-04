import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/schedules')({
  component: Page,
});

function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Schedules</h1>
      <p className="mt-2 text-chill-text-muted">Coming soon.</p>
    </div>
  );
}
