import { SignIn } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_unauthenticated/sign-in/$')({
  component: Page,
});

function Page() {
  return (
    <div className="flex flex-col items-center gap-6">
      <span className="font-semibold text-xl tracking-tight text-chill-text">
        Bill<span className="text-chill-ice">Chill.</span>
      </span>
      <SignIn
        appearance={{
          variables: {
            colorBackground: '#ffffff',
            colorAlphaShade: '#e5e7eb',
          },
        }}
      />
    </div>
  );
}
