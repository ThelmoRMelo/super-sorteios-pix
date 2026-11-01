import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";

export function SiteHeader({ dark = false, themeIndependent = false }: { dark?: boolean; themeIndependent?: boolean }) {
  return (
    <header
      style={themeIndependent ? {
        "--accent": "oklch(0.83 0.16 82)",
        "--accent-foreground": "oklch(0.25 0.05 70)",
        "--primary-foreground": "oklch(0.98 0.02 92)",
        "--gradient-gold": "linear-gradient(135deg, oklch(0.88 0.15 90), oklch(0.76 0.16 70))",
      } as React.CSSProperties : undefined}
      className={`mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8 ${dark ? "text-primary-foreground" : "text-foreground"}`}
    >
      <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
        <span className="grid size-8 place-items-center rounded-lg bg-gold text-accent-foreground">
          <Ticket className="size-4" />
        </span>
        Sorteiaí
      </Link>
      <Link to="/painel" className="text-sm font-medium underline-offset-4 hover:underline">
        Meus sorteios
      </Link>
    </header>
  );
}
