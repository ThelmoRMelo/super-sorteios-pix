import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { criarReserva } from "@/lib/reservas.functions";
import { type ReservaRecibo } from "@/lib/reservas";
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
    refetchInterval: 5000,
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
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState<(ReservaRecibo & { link: string }) | null>(null);
  const [agora, setAgora] = useState(0);
  const pedidoId = useRef<string | null>(null);
  const reservar = useServerFn(criarReserva);
  const qc = useQueryClient();
  const vendidos = useMemo(() => new Set(data?.vendidos ?? []), [data]);
  const reservados = useMemo(() => new Set(data?.reservados ?? []), [data]);
  useEffect(() => {
    setSel((ns) => ns.filter((n) => !vendidos.has(n) && !reservados.has(n)));
  }, [vendidos, reservados]);
  useEffect(() => {
    setAgora(Date.now());
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (pedido && agora >= Date.parse(pedido.expires_at)) {
      setPedido(null); pedidoId.current = null;
      void qc.invalidateQueries({ queryKey: ["sorteio-publico", id] });
    }
  }, [pedido, agora, qc, id]);
  if (!data) return null;
  const s = data.sorteio;
  const nums = rangeNumeros(s.numero_inicial, s.numero_final);
  const premios = (s.premios_lista as string[]) ?? [];
  const ganhadores = (s.ganhadores_lista as Ganhador[]) ?? [];
  const aberto = s.status === "publicado";
  const preco = Number(s.preco_unitario);

  function toggle(n: number) {
    if (!aberto || vendidos.has(n) || reservados.has(n) || enviando || pedido) return;
    pedidoId.current = null;
    setSel((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  }

  async function comprar() {
    if (nome.trim().length < 2) { toast.error("Informe seu nome completo"); return; }
    if (telefone.replace(/\D/g, "").length < 10) { toast.error("Informe seu WhatsApp com DDD"); return; }
    if (!sel.length || enviando) return;
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setEnviando(true);
    pedidoId.current ??= crypto.randomUUID();
    try {
      const result = await reservar({ data: { sorteioId: id, pedidoId: pedidoId.current, numeros: sel, nome, telefone } });
      if (!result.ok) {
        popup?.close(); toast.error(result.error); pedidoId.current = null;
        await qc.invalidateQueries({ queryKey: ["sorteio-publico", id] });
        return;
      }
      const msg = mensagemCompra({ sorteio: s.nome, numeros: sel, fim: s.numero_final, preco: Number(result.recibo.preco_unitario), nome: nome.trim(), url: `https://super-sorteios-pix.lovable.app/s/${id}` }) + `\nWhatsApp: ${telefone}\nPedido: ${result.recibo.id}\nReserva válida até: ${new Date(result.recibo.expires_at).toLocaleString("pt-BR")}`;
      const link = whatsappLink(s.whatsapp, msg);
      setPedido({ ...result.recibo, link }); setSel([]);
      if (popup) popup.location.href = link;
      toast.success("Números reservados por 30 minutos");
      await qc.invalidateQueries({ queryKey: ["sorteio-publico", id] });
    } catch {
      popup?.close(); toast.error("Não foi possível confirmar a reserva. Tente novamente.");
    } finally { setEnviando(false); }
  }

  return (
    <div className="min-h-screen pb-40">
      <section className="bg-hero pb-8">
        <SiteHeader dark />
        <div className="mx-auto w-full max-w-4xl px-4 text-primary-foreground sm:px-6 md:px-8">
          {s.imagem_url && <img src={s.imagem_url} alt={s.nome} className="mb-5 aspect-[16/9] w-full rounded-2xl object-cover shadow-ticket" />}
          <h1 className="break-words text-2xl font-extrabold sm:text-4xl md:text-5xl">{s.nome}</h1>
          {s.descricao && <p className="mt-3 whitespace-pre-line text-primary-foreground/80">{s.descricao}</p>}
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-gold px-3 py-1 font-bold text-accent-foreground">{formatBRL(preco)} / número</span>
            <span className="rounded-full bg-primary-foreground/15 px-3 py-1">{nums.filter((n) => !vendidos.has(n) && !reservados.has(n)).length} disponíveis</span>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 md:px-8">
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
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold">Escolha seus números</h2>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><i className="size-3 rounded bg-card ring-1 ring-border" />Livre</span>
              <span className="flex items-center gap-1"><i className="size-3 rounded bg-gold" />Reservado</span>
              <span className="flex items-center gap-1"><i className="size-3 rounded bg-sold" />Vendido</span>
            </div>
          </div>
          {!aberto && <p className="mt-2 text-sm text-muted-foreground">As vendas deste sorteio estão encerradas.</p>}
          <div className="mt-4 grid grid-cols-5 gap-1.5 min-[380px]:gap-2 sm:grid-cols-10">
            {nums.map((n) => {
              const v = vendidos.has(n);
              const r = reservados.has(n);
              const on = sel.includes(n);
              return (
                <Button variant="ghost"
                  key={n}
                  onClick={() => toggle(n)}
                  aria-label={`Número ${padNumero(n, s.numero_final)}${v ? " vendido" : r ? " reservado" : ""}`}
                  aria-pressed={on}
                  disabled={v || r || !aberto || enviando || Boolean(pedido)}
                  className={`h-auto aspect-square p-0 rounded-xl font-display text-sm font-bold transition ${
                    v ? "bg-sold text-sold-foreground line-through" : r ? "bg-gold text-accent-foreground" : on ? "bg-primary text-primary-foreground scale-105 shadow-ticket" : "bg-card ring-1 ring-border hover:ring-primary"
                  }`}
                >
                  {padNumero(n, s.numero_final)}
                </Button>
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

      {pedido && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-card px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold">Reserva registrada</p><p className="text-sm text-muted-foreground">Válida por mais {Math.max(0, Math.ceil((Date.parse(pedido.expires_at) - agora) / 60000))} min · Pedido {pedido.id.slice(0, 8)}</p></div>
            <Button variant="whatsapp" asChild><a href={pedido.link} target="_blank" rel="noreferrer"><MessageCircle /> Abrir WhatsApp</a></Button>
          </div>
        </div>
      )}
      {sel.length > 0 && aberto && !pedido && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
          <div className="mx-auto w-full max-w-4xl space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{sel.length} número(s)</span>
              <b className="font-display text-lg">{formatBRL(sel.length * preco)}</b>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input aria-label="Seu nome" placeholder="Seu nome" maxLength={120} disabled={enviando} value={nome} onChange={(e) => { setNome(e.target.value); pedidoId.current = null; }} />
              <Input aria-label="Seu WhatsApp com DDD" type="tel" placeholder="WhatsApp com DDD" maxLength={20} disabled={enviando} value={telefone} onChange={(e) => { setTelefone(e.target.value); pedidoId.current = null; }} />
              <Button variant="whatsapp" size="lg" disabled={enviando} onClick={comprar}><MessageCircle /> {enviando ? "Reservando…" : "Reservar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
