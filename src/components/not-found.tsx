import { useAuth } from '@clerk/tanstack-react-start';
import { Link } from '@tanstack/react-router';
import { AuthenticatedShell } from '#/components/authenticated-shell';

function NotFoundCopy() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-7xl font-bold tracking-tight">404</p>
      <p className="text-xl font-medium">Page not found.</p>
      <p className="text-sm text-chill-text-muted">
        We couldn&apos;t find what you were looking for.
      </p>
    </div>
  );
}

export default function NotFound() {
  const { isSignedIn } = useAuth();

  if (isSignedIn === true) {
    return (
      <AuthenticatedShell>
        <div className="px-6 py-16 flex justify-center">
          <div className="flex flex-col items-center gap-8 text-center max-w-md">
            <NotFoundCopy />
            <Link
              to="/dashboard"
              className="text-sm text-chill-teal hover:underline"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </AuthenticatedShell>
    );
  }

  return (
    <div className="bg-chill-bg text-chill-text min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        <span className="font-semibold text-xl tracking-tight">
          Bill<span className="text-chill-ice">Chill.</span>
        </span>
        <NotFoundCopy />
        <Link to="/" className="text-sm text-chill-teal hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
