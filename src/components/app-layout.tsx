import { UserButton } from '@clerk/tanstack-react-start';
import { Link } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import * as React from 'react';
import { FiCalendar, FiFileText, FiGrid, FiMenu } from 'react-icons/fi';
import { AttentionBanner } from '#/components/attention-banner';
import { BillActionsNavButton } from '#/components/bill-actions-nav-button';

export default function AppLayout({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-chill-bg text-chill-text overflow-hidden">
      {/* Desktop sidebar — always visible */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-chill-surface border-r border-chill-border px-4 py-6">
        <SidebarContents />
      </aside>

      {/* Mobile: backdrop + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/25 z-20 lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-30 flex flex-col w-56 bg-chill-surface border-r border-chill-border px-4 py-6 lg:hidden">
            <SidebarContents onLinkClick={closeMobile} />
          </aside>
        </>
      )}

      {/* Content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-auto">
        {/* Top bar — both breakpoints */}
        <header className="flex items-center gap-3 px-4 py-4 bg-chill-surface border-b border-chill-border shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1 rounded-md text-chill-text-muted hover:bg-chill-purple-light transition-colors"
            aria-label="Open menu"
          >
            <FiMenu size={20} aria-hidden="true" />
          </button>
          <span className="lg:hidden flex-1 font-semibold text-xl tracking-tight text-center">
            Bill<span className="text-chill-ice">Chill.</span>
          </span>
          <div className="hidden lg:block flex-1" />
          <BillActionsNavButton />
        </header>

        <AttentionBanner />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContents({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 mb-8">
        <span className="font-semibold text-xl tracking-tight">
          Bill<span className="text-chill-ice">Chill.</span>
        </span>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        <NavLink
          to="/dashboard"
          icon={<FiGrid size={16} aria-hidden="true" />}
          onClick={onLinkClick}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/bills"
          icon={<FiFileText size={16} aria-hidden="true" />}
          onClick={onLinkClick}
        >
          Bills
        </NavLink>
        <NavLink
          to="/schedules"
          icon={<FiCalendar size={16} aria-hidden="true" />}
          onClick={onLinkClick}
        >
          Schedules
        </NavLink>
      </nav>

      <div className="pt-4 border-t border-chill-border">
        <UserButton />
      </div>
    </div>
  );
}

function NavLink({
  to,
  icon,
  onClick,
  children,
}: {
  to: '/dashboard' | '/bills' | '/schedules';
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2.5 transition-colors w-full"
      activeProps={{ className: 'bg-chill-purple text-chill-text' }}
      inactiveProps={{
        className: 'text-chill-text-muted hover:bg-chill-purple-light',
      }}
    >
      {icon}
      {children}
    </Link>
  );
}
