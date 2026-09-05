"use client";

import { usePathname } from "next/navigation";

import { DataSafety } from "@/components/data-safety";
import { Mark } from "@/components/mark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Today" },
  { href: "/walk", label: "Walk" },
  { href: "/independence", label: "Independence" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5 text-foreground">
          <Mark className="size-8 text-faith" />
          <span className="font-heading hidden text-xl tracking-tight sm:inline">Two Goals</span>
        </a>
        <nav aria-label="Primary" className="flex items-center gap-0.5 rounded-full border border-border/80 bg-card/80 p-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href) ||
                  (link.href === "/independence" && (pathname.startsWith("/steward") || pathname.startsWith("/counsel")));
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors sm:px-4",
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <DataSafety />
        <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-heading text-base text-foreground/80">Seek first the kingdom.</p>
          <p>Private by default. Export a backup whenever the data matters.</p>
        </div>
      </div>
    </footer>
  );
}
