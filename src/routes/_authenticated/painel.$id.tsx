import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { reservaAtiva } from "@/lib/reservas";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { SorteioForm, type SorteioInput } from "@/components/SorteioForm";
import { elegiveis, formatBRL, padNumero, randomIndex, rangeNumeros, whatsappLink, type Ganhador } from "@/lib/sorteio-logic";
import { ArrowLeft, Copy, Dices, ExternalLink, Share2, Trash2, Trophy } from "lucide-react";
import { STATUS_LABEL } from "./painel.index";

export const Route = createFileRoute("/_authenticated/painel/$id")({
  head: () => ({
    meta: [
      { title: "Gerenciar sorteio — Sorteiaí" },
      { name: "description", content: "Baixas de vendas, apuração na roleta e edição do sorteio." },
      { property: "og:title", content: "Gerenciar sorteio — Sorteiaí" },
      { property: "og:description", content: "Painel do organizador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gerenciar,
});

function Gerenciar() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const sq = useQuery({
    queryKey: ["sorteio", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sorteios").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const nq = useQuery({
    queryKey: ["numeros", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sorteio_numeros").select("*").eq("sorteio_id", id).order("numero");
      if (error) throw error;
      return data;
    },
  });
  const rq = useQuery({
    queryKey: ["reservas", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sorteio_reservas").select("*").eq("sorteio_id", id).eq("status", "pendente").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sorteio", id] });
    qc.invalidateQueries({ queryKey: ["numeros", id] });
    qc.invalidateQueries({ queryKey: ["reservas", id] });
    qc.invalidateQueries({ queryKey: ["sorteio-publico", id] });
  };

  const s = sq.data;
  if (sq.isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!s) return <div className="p-10 text-center">Sorteio não encontrado ou você não é o criador. <Link to="/painel" className="text-primary underline">Voltar</Link></div>;

  const vendas = nq.data ?? [];
  const total = s.numero_final - s.numero_inicial + 1;
  const publicUrl = `https://super-sorteios-pix.lovable.app/s/${s.id}`;

  async function setStatus(status: string) {
    const { error } = await supabase.from("sorteios").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Status: ${STATUS_LABEL[status]}`); refresh(); }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 md:px-8">
        <Link to="/painel" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Meus sorteios</Link>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h1 className="min-w-0 break-words text-2xl font-extrabold sm:text-3xl">{s.nome}</h1>
          <span className="mt-1.5 shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{STATUS_LABEL[s.status]}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Vendidos" value={`${vendas.length}/${total}`} />
          <Stat label="Arrecadado" value={formatBRL(vendas.length * Number(s.preco_unitario))} />
          <Stat label="Prêmios" value={String((s.premios_lista as string[]).length)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {s.status === "preparacao" && <Button variant="gold" onClick={() => setStatus("publicado")}>Publicar vitrine</Button>}
          {s.status === "publicado" && <Button variant="outline" onClick={() => setStatus("preparacao")}>Voltar p/ preparação</Button>}
          {s.status !== "cancelado" && s.status !== "encerrado" && <Button variant="ghost" onClick={() => confirm("Cancelar este sorteio?") && setStatus("cancelado")}>Cancelar sorteio</Button>}
          {s.status === "cancelado" && <Button variant="outline" onClick={() => setStatus("preparacao")}>Reativar</Button>}
        </div>

        {s.status !== "preparacao" && (
          <div className="mt-4 rounded-2xl border bg-card p-4 sm:p-5">
            <p className="text-sm font-medium">Link da vitrine</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">{publicUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado"); }}><Copy /> Copiar</Button>
              <Button size="sm" variant="whatsapp" asChild><a href={`https://wa.me/?text=${encodeURIComponent(`🎟️ ${s.nome}\nEscolha seus números: ${publicUrl}`)}`} target="_blank" rel="noreferrer"><Share2 /> Divulgar</a></Button>
              <Button size="sm" variant="ghost" asChild><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a></Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="baixas" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="baixas">Baixas</TabsTrigger>
            <TabsTrigger value="apuracao">Apuração</TabsTrigger>
            <TabsTrigger value="editar">Editar</TabsTrigger>
          </TabsList>
          <TabsContent value="baixas"><Baixas sorteio={s} vendas={vendas} reservas={rq.data ?? []} reservaErro={rq.isError} onChange={refresh} /></TabsContent>
          <TabsContent value="apuracao"><Apuracao sorteio={s} vendas={vendas} onChange={refresh} /></TabsContent>
          <TabsContent value="editar">
            <div className="rounded-2xl border bg-card p-5">
              <SorteioForm
                initial={{ ...(s as unknown as SorteioInput), preco_unitario: Number(s.preco_unitario), premios_lista: (s.premios_lista as string[]).length ? (s.premios_lista as string[]) : [""] }}
                lockRange={vendas.length > 0 || (rq.data ?? []).some((r) => reservaAtiva(r))}
                submitLabel="Salvar alterações"
                onSubmit={async (v) => {
                  const { error } = await supabase.from("sorteios").update({
                    nome: v.nome, descricao: v.descricao, numero_inicial: v.numero_inicial, numero_final: v.numero_final,
                    preco_unitario: v.preco_unitario, whatsapp: v.whatsapp, premios_lista: v.premios_lista, regras: v.regras,
                    imagem_url: v.imagem_url, premio_unico_por_participante: v.premio_unico_por_participante,
                  }).eq("id", id);
                  if (error) toast.error(error.message); else { toast.success("Salvo"); refresh(); }
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card p-3 last:col-span-2 sm:p-4 sm:last:col-span-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-display text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}

type S = NonNullable<Awaited<ReturnType<typeof fetchType>>>;
async function fetchType() { return (await supabase.from("sorteios").select("*").single()).data; }
type V = { id: string; numero: number; comprador_nome: string; comprador_telefone: string; observacao: string };

function parseNums(txt: string) {
  return [...new Set(txt.split(/[\s,;]+/).filter(Boolean).map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
}

function Baixas({ sorteio: s, vendas, reservas, reservaErro, onChange }: { sorteio: S; vendas: V[]; reservas: Tables<"sorteio_reservas">[]; reservaErro: boolean; onChange: () => void }) {
  const [nums, setNums] = useState("");
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [busca, setBusca] = useState("");
  const [pedido, setPedido] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const ativas = reservas.filter((r) => reservaAtiva(r, agora));
  const reservados = new Set(ativas.flatMap((r) => r.numeros));
  const selecionado = ativas.find((r) => r.id === pedido);
  const vendidos = useMemo(() => new Set(vendas.map((v) => v.numero)), [vendas]);
  const selecionados = useMemo(() => new Set(parseNums(nums)), [nums]);
  const travado = s.status === "encerrado" || s.status === "cancelado";

  function limpar() { setPedido(null); setNums(""); setNome(""); setTel(""); }
  function carregar(r: Tables<"sorteio_reservas">) {
    setPedido(r.id); setNums(r.numeros.join(", ")); setNome(r.comprador_nome); setTel(r.comprador_telefone);
  }
  async function resolver(id: string, confirmar: boolean) {
    if (salvando) return;
    setSalvando(true);
    try {
      const { error } = await supabase.rpc("resolver_reserva", { _pedido_id: id, _confirmar: confirmar });
      if (error) { toast.error(error.message); onChange(); return; }
      toast.success(confirmar ? "Pagamento confirmado e números baixados" : "Reserva cancelada; números liberados");
      limpar(); onChange();
    } finally { setSalvando(false); }
  }

  function alternar(n: number) {
    if (vendidos.has(n) || reservados.has(n) || travado || pedido || salvando) return;
    const atual = parseNums(nums);
    const nova = atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n].sort((a, b) => a - b);
    setNums(nova.join(", "));
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (travado || salvando) return;
    if (pedido) {
      if (!selecionado) { toast.error("Esta reserva expirou. Escolha os números novamente."); limpar(); onChange(); return; }
      await resolver(pedido, true); return;
    }
    const lista = parseNums(nums).filter((n) => n >= s.numero_inicial && n <= s.numero_final);
    if (!lista.length) { toast.error("Informe números válidos do intervalo"); return; }
    const ocupados = lista.filter((n) => vendidos.has(n) || reservados.has(n));
    if (ocupados.length) { toast.error(`Vendidos ou reservados: ${ocupados.join(", ")}`); return; }
    const { error } = await supabase.from("sorteio_numeros").insert(
      lista.map((numero) => ({ sorteio_id: s.id, numero, comprador_nome: nome.trim(), comprador_telefone: tel.trim() })),
    );
    if (error) return void toast.error(error.message.includes("uq_sorteio_numero") ? "Algum número já foi vendido" : error.message);
    toast.success(`${lista.length} número(s) baixado(s) para ${nome}`);
    setNums(""); setNome(""); setTel("");
    onChange();
  }

  async function remover(v: V) {
    if (!confirm(`Estornar número ${v.numero} de ${v.comprador_nome}?`)) return;
    const { error } = await supabase.from("sorteio_numeros").delete().eq("id", v.id);
    if (error) toast.error(error.message); else onChange();
  }

  const filtradas = vendas.filter((v) => !busca || v.comprador_nome.toLowerCase().includes(busca.toLowerCase()) || String(v.numero) === busca);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="font-bold text-lg">Pedidos pendentes <span className="text-muted-foreground">({ativas.length})</span></h2>
        {reservaErro && <p className="text-sm text-destructive">Não foi possível carregar os pedidos. Atualize a página antes de dar baixa.</p>}
        {!reservaErro && ativas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido aguardando confirmação.</p>}
        {ativas.map((r) => (
          <div key={r.id} className={`rounded-lg border p-4 ${pedido === r.id ? "border-primary bg-secondary" : "bg-card"}`}>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="min-w-0"><p className="font-bold break-words">{r.comprador_nome}</p><p className="text-sm text-muted-foreground">Pedido {r.id.slice(0, 8)} · {r.comprador_telefone}</p></div>
              <p className="font-bold">{formatBRL(r.numeros.length * Number(r.preco_unitario))}</p>
            </div>
            <p className="mt-2 break-words text-sm">Números: {r.numeros.map((n) => padNumero(n, s.numero_final)).join(", ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Expira em {Math.max(0, Math.ceil((Date.parse(r.expires_at) - agora) / 60000))} min</p>
            {!travado && <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={salvando} onClick={() => carregar(r)}>Selecionar pedido</Button>
              <Button size="sm" disabled={salvando || s.status !== "publicado"} onClick={() => confirm(`Confirmar o pagamento de ${r.comprador_nome}?`) && resolver(r.id, true)}>Confirmar pagamento</Button>
              <Button size="sm" variant="ghost" disabled={salvando} onClick={() => confirm("Cancelar esta reserva e liberar os números?") && resolver(r.id, false)}>Cancelar reserva</Button>
            </div>}
          </div>
        ))}
      </section>
      {!travado && (
        <form onSubmit={registrar} className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
          <p className="font-bold">{pedido ? "Confirmar pedido selecionado" : "Dar baixa (registrar venda)"}</p>
          {pedido && !selecionado && <p className="text-sm text-destructive">Esta reserva expirou.</p>}
          <Input required aria-label="Números da baixa" readOnly={Boolean(pedido)} placeholder="Toque nos números no mapa ou digite: 5, 12, 33" value={nums} onChange={(e) => setNums(e.target.value)} onBlur={() => setNums(parseNums(nums).join(", "))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input required aria-label="Nome do comprador" readOnly={Boolean(pedido)} placeholder="Nome do comprador" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input aria-label="Telefone do comprador" readOnly={Boolean(pedido)} placeholder="Telefone (opcional)" value={tel} onChange={(e) => setTel(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={salvando || reservaErro || Boolean(pedido && (!selecionado || s.status !== "publicado"))}>{pedido ? "Confirmar pagamento" : "Registrar venda"}{selecionados.size > 0 ? ` (${selecionados.size})` : ""}</Button>
          {pedido && <Button variant="ghost" className="w-full" onClick={limpar}>Limpar seleção</Button>}
        </form>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Mapa de números</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-card ring-1 ring-border" />Disponível</span>
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-gold" />Selecionado</span>
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-muted ring-1 ring-border" />Reservado</span>
            <span className="flex items-center gap-1"><i className="size-3 rounded bg-primary" />Vendido</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 min-[380px]:grid-cols-8 sm:grid-cols-10 sm:gap-2">
          {rangeNumeros(s.numero_inicial, s.numero_final).map((n) => {
            const vend = vendidos.has(n);
            const res = reservados.has(n);
            const on = selecionados.has(n);
            return (
              <Button variant="ghost"
                key={n}
                type="button"
                aria-pressed={on}
                disabled={vend || res || travado || Boolean(pedido) || salvando}
                onClick={() => alternar(n)}
                className={`h-auto p-0 aspect-square min-h-9 rounded-lg text-xs font-bold transition sm:text-sm ${
                  vend ? "bg-primary text-primary-foreground opacity-80" : on ? "bg-gold text-accent-foreground scale-105 shadow-ticket" : res ? "bg-muted text-muted-foreground" : "bg-card ring-1 ring-border hover:ring-primary"
                }`}
              >
                {padNumero(n, s.numero_final)}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <Input placeholder="Buscar comprador ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <ul className="mt-3 divide-y rounded-2xl border bg-card">
          {filtradas.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhuma venda registrada.</li>}
          {filtradas.map((v) => (
            <li key={v.id} className="flex items-center gap-3 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary font-display text-sm font-bold">{padNumero(v.numero, s.numero_final)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{v.comprador_nome}</p>
                {v.comprador_telefone && (
                  <a className="text-xs text-primary" href={whatsappLink(v.comprador_telefone, `Olá ${v.comprador_nome}! Confirmamos seu número ${v.numero} no sorteio ${s.nome}.`)} target="_blank" rel="noreferrer">{v.comprador_telefone}</a>
                )}
              </div>
              {!travado && <Button variant="ghost" size="icon" onClick={() => remover(v)} aria-label="Estornar"><Trash2 /></Button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Apuracao({ sorteio: s, vendas, onChange }: { sorteio: S; vendas: V[]; onChange: () => void }) {
  const premios = s.premios_lista as string[];
  const homologado = (s.ganhadores_lista as Ganhador[]).length > 0 && s.status === "encerrado";
  const [ganhadores, setGanhadores] = useState<Ganhador[]>(s.ganhadores_lista as Ganhador[]);
  const [display, setDisplay] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prox = ganhadores.length;
  const pool = elegiveis(vendas, ganhadores, s.premio_unico_por_participante);

  function girar() {
    const vencedor = pool[randomIndex(pool.length)];
    if (!vencedor) { toast.error("Não há números elegíveis"); return; }
    setSpinning(true);
    let delay = 40;
    const tick = () => {
      setDisplay(pool[Math.floor(Math.random() * pool.length)]?.numero ?? vencedor.numero);
      delay *= 1.12;
      if (delay < 420) timer.current = setTimeout(tick, delay);
      else {
        setDisplay(vencedor.numero);
        setSpinning(false);
        setGanhadores((g) => [...g, { premio_idx: prox, premio_nome: premios[prox] ?? "", numero: vencedor.numero, nome: vencedor.comprador_nome }]);
      }
    };
    tick();
  }

  async function homologar() {
    if (!confirm("Homologar resultado e encerrar o sorteio? Esta ação publica os ganhadores.")) return;
    const { error } = await supabase.from("sorteios").update({ ganhadores_lista: ganhadores, status: "encerrado", sorteado_em: new Date().toISOString() }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Resultado homologado!"); onChange(); }
  }

  if (!premios.length) return <p className="text-muted-foreground">Cadastre prêmios na aba Editar.</p>;
  if (!vendas.length) return <p className="text-muted-foreground">Registre vendas antes de sortear.</p>;

  return (
    <div className="space-y-5">
      {!homologado && (
        <div className="overflow-hidden rounded-3xl bg-hero p-6 text-center text-primary-foreground shadow-ticket">
          <p className="text-sm uppercase tracking-widest text-primary-foreground/70">
            {prox < premios.length ? `${prox + 1}º prêmio · ${premios[prox]}` : "Todos os prêmios sorteados"}
          </p>
          <div className="relative mx-auto my-6 grid size-44 place-items-center rounded-full bg-gold shadow-ticket">
            <div className={`absolute inset-2 rounded-full border-4 border-dashed border-accent-foreground/30 ${spinning ? "animate-spin" : ""}`} />
            <span key={spinning ? display ?? 0 : `f${display}`} className={`font-display text-6xl font-extrabold text-accent-foreground ${spinning ? "" : "animate-pop"}`}>
              {display != null ? padNumero(display, s.numero_final) : "?"}
            </span>
          </div>
          <p className="text-xs text-primary-foreground/70">{pool.length} número(s) concorrendo</p>
          {prox < premios.length && (
            <Button variant="gold" size="lg" className="mt-4" disabled={spinning} onClick={girar}><Dices /> {spinning ? "Girando…" : "Girar roleta"}</Button>
          )}
        </div>
      )}

      {ganhadores.length > 0 && (
        <ul className="space-y-2">
          {ganhadores.map((g) => (
            <li key={g.premio_idx} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <Trophy className="size-5 text-primary" />
              <span className="font-display font-bold">{padNumero(g.numero, s.numero_final)}</span>
              <span className="min-w-0 flex-1"><b>{g.nome}</b> <span className="text-sm text-muted-foreground">— {g.premio_idx + 1}º {g.premio_nome}</span></span>
            </li>
          ))}
        </ul>
      )}

      {!homologado && ganhadores.length > 0 && !spinning && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setGanhadores([]); setDisplay(null); }}>Refazer</Button>
          <Button className="flex-1" onClick={homologar}>Homologar resultado</Button>
        </div>
      )}
      {homologado && <p className="text-center text-sm text-muted-foreground">Resultado homologado e publicado na vitrine.</p>}
    </div>
  );
}
