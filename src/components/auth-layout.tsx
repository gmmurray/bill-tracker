import { UserButton } from '@clerk/tanstack-react-start';
import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren;

export default function AuthLayout({ children }: Props) {
  return (
    <div className="bg-chill-bg text-chill-text min-h-screen">
      <div
        style={{ display: 'flex', paddingInline: '5rem', marginBottom: '3rem' }}
      >
        <div>bill chill</div>
        <div style={{ marginLeft: 'auto' }}>
          <UserButton />
        </div>
      </div>

      <div style={{ paddingInline: '5rem' }}>{children}</div>
    </div>
  );
}
