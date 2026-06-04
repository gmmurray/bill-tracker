import { createFileRoute, Link } from '@tanstack/react-router';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardFooter, CardHeader } from '#/components/ui/card';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="bg-chill-bg text-chill-text min-h-screen flex flex-col px-12 lg:px-24 xl:px-40">
      <nav className="flex items-center py-8">
        <span className="font-semibold text-xl tracking-tight">
          Bill<span className="text-chill-ice">Chill.</span>
        </span>
        <Button asChild className="ml-auto">
          <Link to="/sign-in/$">Sign In</Link>
        </Button>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row items-center gap-16 py-12 lg:py-0">
        {/* Left: hero copy */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-6xl xl:text-7xl 2xl:text-8xl font-bold leading-none tracking-tight">
            Stop chasing
            <br />
            due dates.
          </h1>
          <p className="mt-5 text-xl xl:text-2xl text-chill-text-muted font-medium leading-snug">
            Rule your bills by your own schedule.
          </p>
          <p className="mt-5 text-base text-chill-text-muted leading-relaxed max-w-sm">
            Group your bills into custom pay schedules. Pay everything at once,
            on your terms, and forget about money until the next cycle.
          </p>
          <Button
            asChild
            variant="primary"
            size="lg"
            className="mt-8 self-start"
          >
            <Link to="/sign-in/$">Create your first schedule</Link>
          </Button>
        </div>

        {/* Right: preview card */}
        <div className="flex-1 flex items-center justify-center w-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-chill-text-muted">
                  Your Active Pay Schedule
                </p>
                <p className="text-xs text-chill-text-muted mt-0.5">
                  Anchored to the 1st
                </p>
              </div>
              <Badge variant="teal">3 of 4 paid</Badge>
            </CardHeader>

            <div>
              <BillRow label="Rent / Mortgage" amount="$1,200" state="paid" />
              <BillRow label="Electric Utility" amount="$142" state="paid" />
              <BillRow label="Car Insurance" amount="$89" state="missed" />
              <BillRow
                label="Internet Subscription"
                amount="$65"
                state="upcoming"
              />
            </div>

            <CardFooter>
              <div className="flex items-center justify-between text-xs text-chill-text-muted">
                <span>Total this cycle</span>
                <span className="font-semibold text-chill-text">$1,496</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-chill-teal-light overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-chill-teal" />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

type BillRowState = 'paid' | 'missed' | 'upcoming';

function BillRow({
  label,
  amount,
  state,
}: {
  label: string;
  amount: string;
  state: BillRowState;
}) {
  const rowClass =
    state === 'paid'
      ? 'bg-chill-purple-light'
      : state === 'missed'
        ? 'bg-amber-50 border-l-2 border-l-amber-400'
        : '';

  const textClass =
    state === 'upcoming' ? 'text-chill-text-muted' : 'text-chill-text';

  return (
    <div
      className={`flex items-center gap-3 px-6 py-4 border-t border-chill-border ${rowClass}`}
    >
      {state === 'paid' ? <FilledCheck /> : <EmptyCheck />}
      <span className={`flex-1 text-sm ${textClass}`}>{label}</span>
      <span className={`text-sm font-medium ${textClass}`}>{amount}</span>
    </div>
  );
}

function FilledCheck() {
  return (
    <div className="w-4 h-4 rounded bg-chill-teal flex items-center justify-center shrink-0">
      <svg
        width="10"
        height="8"
        viewBox="0 0 10 8"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1 4L3.5 6.5L9 1"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function EmptyCheck() {
  return (
    <div className="w-4 h-4 rounded border border-chill-border shrink-0" />
  );
}
