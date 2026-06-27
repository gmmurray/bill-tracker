import { SignIn } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/_unauthenticated/sign-in/$')({
  validateSearch: z.object({
    redirect_url: z.string().optional(),
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.png" alt="" className="h-12 w-12" aria-hidden="true" />
        <span className="font-semibold text-xl tracking-tight text-chill-text">
          Bill<span className="text-chill-ice">Chill.</span>
        </span>
      </div>
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
