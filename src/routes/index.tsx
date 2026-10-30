import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { listSorteiosPublicos } from "@/lib/sorteios.functions";
import { formatBRL } from "@/lib/sorteio-logic";
import { Dices, MessageCircle, Trophy } from "lucide-react";

const publicosQuery = queryOptions({ queryKey: ["sorteios-publicos"], queryFn: () => listSorteiosPublicos() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sorteiaí — Crie sorteios por números e venda pelo WhatsApp" },
      { name: "description", content: "Monte sua vitrine de números, receba pedidos no WhatsApp, dê baixa nas vendas e sorteie ao vivo na roleta." },
      { property: "og:title", content: "Sorteiaí — Sorteios por números" },
      { property: "og:description", content: "Vitrine pública, vendas pelo WhatsApp e roleta de apuração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicosQuery),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(publicosQuery);
  return (
    <div className="min-h-screen">
      <section className="bg-hero pb-16">
        <SiteHeader dark />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pt-8 text-primary-foreground">
          <p className="inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            Rifas & sorteios
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Venda seus números. Sorteie na roleta.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Crie a vitrine em minutos, receba pedidos pelo WhatsApp e apure os ganhadores ao vivo.
          </p>
          <Button asChild variant="gold" size="lg" className="mt-7">
            <Link to="/painel">Criar meu sorteio</Link>
          </Button>
          <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
            {[
              { i: MessageCircle, t: "Pedidos no WhatsApp" },
              { i: Dices, t: "Roleta ao vivo" },
              { i: Trophy, t: "Até 30 prêmios" },
            ].map(({ i: I, t }) => (
              <div key={t} className="rounded-2xl bg-primary-foreground/10 p-3">
                <I className="mb-2 size-5 text-accent" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-10">
        <h2 className="text-2xl font-bold">Sorteios abertos</h2>
        {data.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Nenhum sorteio publicado ainda. Seja o primeiro!</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {data.map((s) => (
              <Link
                key={s.id}
                to="/s/$id"
                params={{ id: s.id }}
                className="group overflow-hidden rounded-2xl border bg-card shadow-ticket transition-transform hover:-translate-y-0.5"
              >
                {s.imagem_url && <img src={s.imagem_url} alt={s.nome} className="h-40 w-full object-cover" loading="lazy" />}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{s.nome}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === "encerrado" ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {s.status === "encerrado" ? "Encerrado" : "Aberto"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatBRL(Number(s.preco_unitario))} por número · {s.numero_final - s.numero_inicial + 1} números
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
