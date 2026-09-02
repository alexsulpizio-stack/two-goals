"use client";

import { usePathname } from "next/navigation";

import { Mark } from "@/components/mark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Compass" },
  { href: "/walk", label: "Walk" },
  { href: "/steward", label: "Steward" },
  { href: "/counsel", label: "Counsel" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5 text-foreground">
          <Mark className="size-8 text-faith" />
          <span className="font-heading hidden text-xl tracking-tight sm:inline">
            Two Goals
          </span>
        </a>
        <nav className="flex max-w-[min(100%,28rem)] items-center gap-0.5 overflow-x-auto rounded-full border border-border/80 bg-card/80 p-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                data-nav={link.href}
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors sm:px-3.5",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between sm:px-6">
        <p className="font-heading text-base text-foreground/80">
          Seek first the kingdom.
        </p>
        <p>Numbers stay on this device. Scripture from the World English Bible.</p>
      </div>
    </footer>
  );
}
