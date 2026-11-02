import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { listSorteiosPublicos } from "@/lib/sorteios.functions";
import { formatBRL } from "@/lib/sorteio-logic";
import { MessageCircle, Radio, Rocket, Trophy } from "lucide-react";
import heroRoleta from "@/assets/hero-roleta.png";

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
      <section className="relative overflow-hidden bg-hero pb-16">
        <div aria-hidden className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-accent/25 blur-3xl" />
        <SiteHeader dark />
        <div className="relative mx-auto max-w-5xl px-4 pt-4 text-primary-foreground sm:px-6 md:px-8">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl">
                Seu sorteio
                <span className="block text-accent">começa aqui</span>
              </h1>
              <div className="mx-auto mt-3 h-1 w-40 rounded-full bg-gold md:mx-0" />
              <p className="mx-auto mt-5 max-w-md text-lg text-primary-foreground/85 md:mx-0">
                Crie sua vitrine, receba pedidos pelo WhatsApp e apure os ganhadores ao vivo.
              </p>
              <div className="mt-8 flex justify-center md:justify-start">
                <Button asChild variant="gold" size="lg" className="h-14 w-full max-w-md rounded-full px-8 text-base font-bold shadow-ticket sm:w-auto">
                  <Link to="/painel">
                    <Rocket className="size-5" /> Gerenciar & Criar Sorteios
                  </Link>
                </Button>
              </div>
            </div>
            <img
              src={heroRoleta}
              alt="Roleta da sorte dourada com bolinhas numeradas e moedas"
              width={1024}
              height={1024}
              className="mx-auto w-full max-w-sm drop-shadow-2xl md:max-w-md"
            />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm font-semibold">
            {[
              { i: MessageCircle, t: "Pedidos pelo WhatsApp" },
              { i: Radio, t: "Roleta ao vivo" },
              { i: Trophy, t: "Até 30 prêmios" },
            ].map(({ i: I, t }) => (
              <div key={t} className="flex flex-col items-center gap-2 rounded-2xl border border-accent/30 bg-primary-foreground/10 p-4 text-center backdrop-blur-sm">
                <I className="size-7 text-accent" />
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
