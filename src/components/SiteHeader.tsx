import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  return (
    <header className={`mx-auto flex max-w-5xl items-center justify-between px-5 py-4 ${dark ? "text-primary-foreground" : "text-foreground"}`}>
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
