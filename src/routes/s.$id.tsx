import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getSorteioPublico } from "@/lib/sorteios.functions";
import { formatBRL, mensagemCompra, padNumero, rangeNumeros, whatsappLink, type Ganhador } from "@/lib/sorteio-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { Gift, MessageCircle, Trophy } from "lucide-react";

const q = (id: string) =>
  queryOptions({
    queryKey: ["sorteio-publico", id],
    queryFn: () => getSorteioPublico({ data: { id } }),
    refetchInterval: 15000,
  });

export const Route = createFileRoute("/s/$id")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(q(params.id));
    if (!d) throw notFound();
    return { nome: d.sorteio.nome, descricao: d.sorteio.descricao, img: d.sorteio.imagem_url };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Sorteio indisponível" }, { name: "robots", content: "noindex" }] };
    const desc = loaderData.descricao || `Escolha seus números e participe do sorteio ${loaderData.nome}.`;
    const meta = [
      { title: `${loaderData.nome} — Sorteiaí` },
      { name: "description", content: desc },
      { property: "og:title", content: loaderData.nome },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (loaderData.img?.startsWith("https://")) {
      meta.push({ property: "og:image", content: loaderData.img }, { name: "twitter:image", content: loaderData.img });
    }
    return { meta };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p>Sorteio não encontrado.</p>
      <Link to="/" className="text-primary underline">Voltar</Link>
    </div>
  ),
  component: Vitrine,
});

function Vitrine() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(q(id));
  const [sel, setSel] = useState<number[]>([]);
  const [nome, setNome] = useState("");
  const vendidos = useMemo(() => new Set(data?.vendidos ?? []), [data]);
  if (!data) return null;
  const s = data.sorteio;
  const nums = rangeNumeros(s.numero_inicial, s.numero_final);
  const premios = (s.premios_lista as string[]) ?? [];
  const ganhadores = (s.ganhadores_lista as Ganhador[]) ?? [];
  const aberto = s.status === "publicado";
  const preco = Number(s.preco_unitario);

  function toggle(n: number) {
    if (!aberto || vendidos.has(n)) return;
    setSel((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  }

  function comprar() {
    if (!nome.trim()) { toast.error("Informe seu nome"); return; }
    const msg = mensagemCompra({ sorteio: s.nome, numeros: sel, fim: s.numero_final, preco, nome: nome.trim(), url: window.location.href });
    window.open(whatsappLink(s.whatsapp, msg), "_blank");
  }

  return (
    <div className="min-h-screen pb-40">
      <section className="bg-hero pb-8">
        <SiteHeader dark />
        <div className="mx-auto max-w-3xl px-5 text-primary-foreground">
          {s.imagem_url && <img src={s.imagem_url} alt={s.nome} className="mb-5 aspect-[16/9] w-full rounded-2xl object-cover shadow-ticket" />}
          <h1 className="text-3xl font-extrabold sm:text-5xl">{s.nome}</h1>
          {s.descricao && <p className="mt-3 whitespace-pre-line text-primary-foreground/80">{s.descricao}</p>}
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-gold px-3 py-1 font-bold text-accent-foreground">{formatBRL(preco)} / número</span>
            <span className="rounded-full bg-primary-foreground/15 px-3 py-1">{nums.length - vendidos.size} disponíveis</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        {ganhadores.length > 0 && (
          <section className="rounded-2xl border-2 border-accent bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Trophy className="size-5 text-accent-foreground" /> Ganhadores</h2>
            <ul className="mt-3 space-y-2">
              {ganhadores.map((g) => (
                <li key={g.premio_idx} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold font-display font-bold text-accent-foreground">{padNumero(g.numero, s.numero_final)}</span>
                  <span><b>{g.nome}</b><br /><span className="text-sm text-muted-foreground">{g.premio_nome}</span></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Gift className="size-5 text-primary" /> Prêmios</h2>
          <ol className="mt-3 space-y-1">
            {premios.map((p, i) => (
              <li key={i} className="flex gap-3"><span className="font-display font-bold text-primary">{i + 1}º</span>{p}</li>
            ))}
          </ol>
        </section>

        <section>
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold">Escolha seus números</h2>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><i className="size-3 rounded bg-card ring-1 ring-border" />Livre</span>
              <span className="flex items-center gap-1"><i className="size-3 rounded bg-sold" />Vendido</span>
            </div>
          </div>
          {!aberto && <p className="mt-2 text-sm text-muted-foreground">As vendas deste sorteio estão encerradas.</p>}
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {nums.map((n) => {
              const v = vendidos.has(n);
              const on = sel.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => toggle(n)}
                  disabled={v || !aberto}
                  className={`aspect-square rounded-xl font-display text-sm font-bold transition ${
                    v ? "bg-sold text-sold-foreground line-through" : on ? "bg-primary text-primary-foreground scale-105 shadow-ticket" : "bg-card ring-1 ring-border hover:ring-primary"
                  }`}
                >
                  {padNumero(n, s.numero_final)}
                </button>
              );
            })}
          </div>
        </section>

        {s.regras && (
          <section>
            <h2 className="text-xl font-bold">Regras</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{s.regras}</p>
            {s.premio_unico_por_participante && <p className="mt-2 text-sm font-medium">Cada participante pode ganhar apenas um prêmio.</p>}
          </section>
        )}
      </main>

      {sel.length > 0 && aberto && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{sel.length} número(s)</span>
              <b className="font-display text-lg">{formatBRL(sel.length * preco)}</b>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Button variant="whatsapp" size="lg" onClick={comprar}><MessageCircle /> Reservar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
