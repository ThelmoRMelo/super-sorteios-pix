import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SorteioForm, vazio } from "@/components/SorteioForm";
import { formatBRL } from "@/lib/sorteio-logic";
import { LogOut, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/")({
  head: () => ({
    meta: [
      { title: "Meus sorteios — Sorteiaí" },
      { name: "description", content: "Gerencie seus sorteios, vendas e apurações." },
      { property: "og:title", content: "Meus sorteios — Sorteiaí" },
      { property: "og:description", content: "Painel do organizador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

export const STATUS_LABEL: Record<string, string> = {
  preparacao: "Em preparação",
  publicado: "Publicado",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

function Painel() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["meus-sorteios", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sorteios").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">Meus sorteios</h1>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/" }))}><LogOut /> Sair</Button>
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>

        {creating ? (
          <div className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="mb-4 text-xl font-bold">Novo sorteio</h2>
            <SorteioForm
              initial={vazio}
              submitLabel="Criar sorteio"
              onSubmit={async (v) => {
                if (v.numero_final < v.numero_inicial) return void toast.error("Número final deve ser maior que o inicial");
                const { data, error } = await supabase.from("sorteios").insert({ ...v, owner_id: user.id }).select("id").single();
                if (error) return void toast.error(error.message);
                toast.success("Sorteio criado!");
                navigate({ to: "/painel/$id", params: { id: data.id } });
              }}
            />
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setCreating(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button variant="gold" size="lg" className="mt-6 w-full" onClick={() => setCreating(true)}><Plus /> Novo sorteio</Button>
        )}

        <div className="mt-6 space-y-3">
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {!isLoading && data.length === 0 && !creating && <p className="text-muted-foreground">Você ainda não criou nenhum sorteio.</p>}
          {data.map((s) => (
            <Link key={s.id} to="/painel/$id" params={{ id: s.id }} className="block rounded-2xl border bg-card p-4 shadow-ticket">
              <div className="flex items-center justify-between gap-2">
                <b className="font-display text-lg">{s.nome}</b>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{STATUS_LABEL[s.status]}</span>
              </div>
              <p className="text-sm text-muted-foreground">{formatBRL(Number(s.preco_unitario))} · {s.numero_inicial}–{s.numero_final}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
