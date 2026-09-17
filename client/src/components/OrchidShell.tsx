import type { ReactNode } from "react";
import Link from "next/link";

type OrchidNavigationItem = {
  href: string;
  label: string;
  current?: boolean;
};

type OrchidShellProps = {
  children: ReactNode;
  className?: string;
  navigation: readonly OrchidNavigationItem[];
  navigationLabel: string;
  tone?: "explore" | "operate";
};

/** A role-level shell: routes opt in when their workspace is ready for Orchid treatment. */
export function OrchidShell({ children, className = "", navigation, navigationLabel, tone = "explore" }: OrchidShellProps) {
  return <div className={`orchid-shell orchid-shell--${tone} ${className}`.trim()}>
    <nav className="orchid-navigation" aria-label={navigationLabel}>
      {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined}>{item.label}</Link>)}
    </nav>
    {children}
  </div>;
}
