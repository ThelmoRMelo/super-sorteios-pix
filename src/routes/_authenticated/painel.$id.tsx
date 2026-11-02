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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/SiteHeader";
import { SorteioForm, type SorteioInput } from "@/components/SorteioForm";
import { elegiveis, formatBRL, padNumero, randomIndex, rangeNumeros, whatsappLink, type Ganhador } from "@/lib/sorteio-logic";
import { ArrowLeft, CheckCircle2, Copy, Dices, ExternalLink, RotateCcw, Share2, Star, Trash2, Trophy, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { STATUS_LABEL } from "./painel.index";
import type { TemaConfig } from "@/lib/temas";
import type { Json } from "@/integrations/supabase/types";

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
                initial={{ ...(s as unknown as SorteioInput), tema: (s.tema as unknown as TemaConfig) ?? null, preco_unitario: Number(s.preco_unitario), premios_lista: (s.premios_lista as string[]).length ? (s.premios_lista as string[]) : [""] }}
                lockRange={vendas.length > 0 || (rq.data ?? []).some((r) => reservaAtiva(r))}
                submitLabel="Salvar alterações"
                onSubmit={async (v) => {
                  const { error } = await supabase.from("sorteios").update({
                    nome: v.nome, descricao: v.descricao, numero_inicial: v.numero_inicial, numero_final: v.numero_final,
                    preco_unitario: v.preco_unitario, whatsapp: v.whatsapp, premios_lista: v.premios_lista, regras: v.regras,
                    imagem_url: v.imagem_url, premio_unico_por_participante: v.premio_unico_por_participante,
                    tema: v.tema as unknown as Json,
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

  const ganhadores = (s.ganhadores_lista as Ganhador[] | null) || [];
  const grupos = useMemo(() => {
    const porComprador = new Map<string, { chave: string; nome: string; telefone: string; itens: V[] }>();
    for (const venda of vendas) {
      const nome = venda.comprador_nome.trim();
      const telefone = venda.comprador_telefone.trim();
      const chave = `${nome.toLocaleLowerCase()}_${telefone}`;
      const grupo = porComprador.get(chave) ?? { chave, nome, telefone, itens: [] };
      grupo.itens.push(venda);
      porComprador.set(chave, grupo);
    }

    return [...porComprador.values()].map((grupo) => {
      grupo.itens.sort((a, b) => a.numero - b.numero);
      const numeros = new Set(grupo.itens.map((item) => item.numero));
      return { ...grupo, premiosGanhos: ganhadores.filter((premio) => numeros.has(premio.numero)) };
    });
  }, [vendas, ganhadores]);
  const buscaNormalizada = busca.trim().toLocaleLowerCase();
  const filtradas = grupos.filter((grupo) => {
    if (!buscaNormalizada) return true;
    return grupo.nome.toLocaleLowerCase().includes(buscaNormalizada) ||
      grupo.telefone.toLocaleLowerCase().includes(buscaNormalizada) ||
      grupo.itens.some((item) => String(item.numero) === buscaNormalizada || padNumero(item.numero, s.numero_final) === buscaNormalizada);
  });

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
        <Input placeholder="Buscar por nome, telefone ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="mt-3 space-y-3">
          {filtradas.length === 0 && <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">Nenhuma venda registrada.</p>}
          {filtradas.map((grupo) => (
            <article key={grupo.chave} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold">{grupo.nome}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{grupo.itens.length} {grupo.itens.length === 1 ? "número" : "números"}</p>
                </div>
                {grupo.telefone && <a className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground" href={whatsappLink(grupo.telefone, `Olá ${grupo.nome}! Confirmamos seus números no sorteio ${s.nome}.`)} target="_blank" rel="noreferrer">{grupo.telefone}</a>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {grupo.itens.map((item) => {
                  const premio = grupo.premiosGanhos.find((ganhador) => ganhador.numero === item.numero);
                  return <span key={item.id} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-display text-sm ${premio ? "bg-gold font-extrabold text-accent-foreground shadow-ticket ring-2 ring-gold" : "bg-secondary font-semibold text-secondary-foreground"}`} title={premio ? `${premio.premio_idx + 1}º prêmio${premio.premio_nome ? `: ${premio.premio_nome}` : ""}` : undefined}>
                    {premio ? "★ " : ""}{padNumero(item.numero, s.numero_final)}
                    {!travado && <button type="button" onClick={() => remover(item)} aria-label={`Estornar número ${padNumero(item.numero, s.numero_final)}`} className="ml-1 rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"><Trash2 className="size-3.5" /></button>}
                  </span>;
                })}
              </div>
              {grupo.premiosGanhos.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-accent-foreground">{grupo.premiosGanhos.map((premio) => `${premio.premio_idx + 1}º prêmio${premio.premio_nome ? `: ${premio.premio_nome}` : ""}`).join(" · ")}</p>
                {grupo.telefone && (() => {
                  const premio = grupo.premiosGanhos[0];
                  if (!premio) return null;
                  const numFmt = padNumero(premio.numero, s.numero_final);
                  const premioDesc = premio.premio_nome ? `${premio.premio_idx + 1}º Prêmio (${premio.premio_nome})` : `${premio.premio_idx + 1}º Prêmio`;
                  const texto = `Olá, ${grupo.nome}! Parabéns! 🎉 Seu número ${numFmt} foi sorteado no sorteio ${s.nome} e você ganhou o ${premioDesc}! Entre em contato para combinarmos a entrega do seu prêmio.`;
                  return <Button size="sm" variant="whatsapp" asChild><a href={whatsappLink(grupo.telefone, texto)} target="_blank" rel="noreferrer">Notificar Ganhador no WhatsApp</a></Button>;
                })()}
              </div>}
            </article>
          ))}
        </div>
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
  const [roletaOpen, setRoletaOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [trackOffset, setTrackOffset] = useState(0);
  const [cartoes, setCartoes] = useState<V[]>([]);
  const trilhoRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);
  const [premioUnico, setPremioUnico] = useState<boolean>(s.premio_unico_por_participante);
  const poolPara = (idx: number) => elegiveis(vendas, ganhadores.filter((g) => g.premio_idx !== idx), premioUnico) as V[];
  const pool = alvo !== null ? poolPara(alvo) : [];
  function definirGanhador(idx: number, v: V) {
    setGanhadores((all) => [...all.filter((g) => g.premio_idx !== idx), { premio_idx: idx, premio_nome: premios[idx] ?? "", numero: v.numero, nome: v.comprador_nome }].sort((a, b) => a.premio_idx - b.premio_idx));
  }
  function abrirRoleta(idx: number) {
    setAlvo(idx); setRoletaOpen(true); setDisplay(null); setTrackOffset(0); setCartoes([]);
  }
  soundEnabledRef.current = soundEnabled;
  const confetes = useMemo(() => Array.from({ length: 84 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 2,
    color: ["#34d399", "#22d3ee", "#facc15", "#f472b6", "#a78bfa", "#fb923c"][Math.floor(Math.random() * 6)],
    rotation: Math.floor(Math.random() * 360),
  })), []);

  function getAudioContext() {
    if (!soundEnabledRef.current || typeof window === "undefined") return null;
    try {
      const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextConstructor) return null;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextConstructor();
      if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume().catch(() => undefined);
      return audioContextRef.current;
    } catch {
      return null;
    }
  }

  function playTick(progress: number) {
    const context = getAudioContext();
    if (!context) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(480 - progress * 160, start);
      oscillator.frequency.exponentialRampToValueAtTime(140, start + 0.045);
      gain.gain.setValueAtTime(0.07, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.05);
    } catch { /* áudio pode ser bloqueado pelo navegador */ }
  }

  function playVictory() {
    const context = getAudioContext();
    if (!context) return;
    try {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.1;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.13, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.5);
      });
    } catch { /* áudio pode ser bloqueado pelo navegador */ }
  }

  useEffect(() => () => {
    timeoutRefs.current.forEach(clearTimeout);
    if (timer.current) clearTimeout(timer.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
  }, []);

  function montarCartoes(vencedor: V) {
    const total = 55;
    const indiceVencedor = 45;
    return Array.from({ length: total }, (_, i) => i === indiceVencedor
      ? vencedor
      : pool[Math.floor(Math.random() * pool.length)] ?? vencedor);
  }

  function girar() {
    if (spinning) return;
    const vencedor = pool[randomIndex(pool.length)];
    if (!vencedor) { toast.error("Não há números elegíveis"); return; }
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    const participantes = montarCartoes(vencedor);
    setCartoes(participantes);
    setDisplay(null);
    setTrackOffset(0);
    setSpinning(true);
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= 5500) {
        setDisplay(vencedor.numero);
        setSpinning(false);
        if (alvo !== null) definirGanhador(alvo, vencedor);
        playVictory();
        return;
      }
      setDisplay(pool[Math.floor(Math.random() * pool.length)]?.numero ?? vencedor.numero);
      const progress = Math.min(elapsed / 5500, 1);
      playTick(progress);
      timer.current = setTimeout(tick, 40 + Math.pow(progress, 3) * 380);
    };
    // Calcula a posição pelo centro real do cartão e do visor para manter a seta alinhada em qualquer largura.
    const trilho = trilhoRef.current;
    const centroVencedor = 45 * (112 + 8) + 112 / 2;
    const destino = Math.max(0, Math.round(centroVencedor - (trilho?.clientWidth ?? 0) / 2));
    requestAnimationFrame(() => setTrackOffset(destino));
    tick();
  }

  async function homologar() {
    if (!confirm("Homologar resultado e encerrar o sorteio? Esta ação publica os ganhadores.")) return;
    const { error } = await supabase.from("sorteios").update({ ganhadores_lista: ganhadores, premio_unico_por_participante: premioUnico, status: "encerrado", sorteado_em: new Date().toISOString() }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("Resultado homologado!"); onChange(); }
  }

  if (!premios.length) return <p className="text-muted-foreground">Cadastre prêmios na aba Editar.</p>;
  if (!vendas.length) return <p className="text-muted-foreground">Registre vendas antes de sortear.</p>;

  const ganhadorAtual = alvo !== null ? ganhadores.find((g) => g.premio_idx === alvo) : undefined;
  const completos = premios.every((_, i) => ganhadores.some((g) => g.premio_idx === i));

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-card p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">Somente números vendidos concorrem.</p>
        <p><span className="font-display text-3xl font-extrabold text-primary">{vendas.length}</span> <span className="text-muted-foreground">número(s) elegíveis</span></p>
      </div>

      {!homologado && (
        <div className="flex items-start justify-between gap-3 rounded-3xl border bg-card p-4 sm:p-5">
          <div>
            <p className="font-semibold">Prêmio único por participante</p>
            <p className="text-sm text-muted-foreground">{premioUnico ? "Quem já ganhou não concorre aos próximos prêmios." : "A mesma pessoa pode ganhar mais de um prêmio."}</p>
          </div>
          <Switch checked={premioUnico} disabled={spinning} onCheckedChange={setPremioUnico} aria-label="Prêmio único por participante" />
        </div>
      )}

      {premios.map((premio, idx) => {
        const g = ganhadores.find((x) => x.premio_idx === idx);
        const poolIdx = poolPara(idx);
        const numerosDoGanhador = g ? vendas.filter((v) => v.comprador_nome.trim().toLowerCase() === g.nome.trim().toLowerCase()).map((v) => v.numero).sort((a, b) => a - b) : [];
        return (
          <div key={idx} className="space-y-3 rounded-3xl border bg-card p-4 shadow-ticket sm:p-5">
            <p className="font-display text-lg font-bold">{idx + 1}º Prêmio · {premio}</p>
            {!homologado && (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="gold" disabled={spinning || !poolIdx.length} onClick={() => abrirRoleta(idx)}><Dices /> {g ? "Sortear novamente" : "Girar roleta"} ({idx + 1}º)</Button>
                <span className="text-sm text-muted-foreground">{poolIdx.length} elegíveis</span>
              </div>
            )}
            {g ? (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
                  <Trophy className="size-4 text-primary" />
                  <b className="text-primary">Nº {padNumero(g.numero, s.numero_final)}</b>
                  <span>· {g.nome}</span>
                  {!homologado && (
                    <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" aria-label="Limpar ganhador" onClick={() => setGanhadores((all) => all.filter((x) => x.premio_idx !== idx))}><RotateCcw className="size-4" /></button>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Números adquiridos pelo participante</p>
                  <div className="flex flex-wrap gap-2 rounded-2xl border bg-background/50 p-3">
                    {numerosDoGanhador.map((n) => n === g.numero ? (
                      <span key={n} className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/15 px-2 py-1 font-display font-extrabold text-primary"><Star className="size-4 fill-current" />{padNumero(n, s.numero_final)}</span>
                    ) : (
                      <span key={n} className="px-2 py-1 font-display text-muted-foreground">{padNumero(n, s.numero_final)}</span>
                    ))}
                  </div>
                </div>
              </>
            ) : !homologado && (
              <div>
                <p className="mb-2 text-sm font-semibold">Ou digite o número sorteado e pressione Enter</p>
                <Input inputMode="numeric" placeholder="Número vendido" disabled={spinning} onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const n = Number((e.target as HTMLInputElement).value.trim());
                  const venda = poolIdx.find((v) => v.numero === n);
                  if (!venda) { toast.error("Número não vendido ou não elegível para este prêmio"); return; }
                  definirGanhador(idx, venda);
                  (e.target as HTMLInputElement).value = "";
                }} />
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={roletaOpen} onOpenChange={(open) => { if (!spinning) setRoletaOpen(open); }}>
        <DialogContent className="flex max-h-[90dvh] w-[94vw] max-w-lg flex-col items-stretch justify-start gap-3 overflow-y-auto overscroll-contain rounded-2xl p-3 sm:p-5">
          {display !== null && !spinning && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl" aria-hidden="true">
              {confetes.map((confete, index) => (
                <span key={index} className="roleta-confetti-piece" style={{
                  left: `${confete.left}%`,
                  animationDelay: `${confete.delay}s`,
                  animationDuration: `${confete.duration}s`,
                  backgroundColor: confete.color,
                  transform: `rotate(${confete.rotation}deg)`,
                }} />
              ))}
            </div>
          )}
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b pb-3 pr-8 text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Apuração oficial</p>
              <DialogTitle className="mt-1 text-base sm:text-lg">{(alvo ?? 0) + 1}º Prêmio · {premios[alvo ?? 0] ?? "Resultado"}</DialogTitle>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="mr-1 text-muted-foreground"
              onClick={() => setSoundEnabled((enabled) => !enabled)}
              title={soundEnabled ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
              aria-label={soundEnabled ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
            >
              {soundEnabled ? <Volume2 className="text-primary" /> : <VolumeX />}
            </Button>
          </DialogHeader>

          <div className="relative my-2 shrink-0 select-none">
            <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
              <div className="h-0 w-0 border-x-[10px] border-t-[14px] border-x-transparent border-t-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent sm:w-20" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent sm:w-20" />
            <div ref={trilhoRef} className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl border bg-secondary/70 shadow-inner sm:h-36">
              <div className="flex items-center gap-2 transition-transform [transition-duration:5500ms] [transition-timing-function:cubic-bezier(0.12,0.8,0.15,1)]" style={{ transform: `translateX(-${trackOffset}px)` }}>
                {cartoes.map((item, idx) => (
                  <div key={`${idx}-${item.id}`} className={`flex h-24 w-28 shrink-0 flex-col items-center justify-center rounded-xl border p-2 text-center transition-colors ${!spinning && display === item.numero && idx === 45 ? "border-primary bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.35)]" : "bg-card"}`}>
                    <span className="font-display text-xl font-extrabold">{padNumero(item.numero, s.numero_final)}</span>
                    <span className="mt-1 max-w-full truncate text-xs text-muted-foreground">{item.comprador_nome || "Anônimo"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {display !== null && !spinning && ganhadorAtual && (
            <div className="shrink-0 rounded-xl border border-primary/40 bg-primary/10 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Número contemplado</p>
              <p className="font-display text-3xl font-extrabold">{padNumero(display, s.numero_final)}</p>
              <p className="truncate text-sm">{ganhadorAtual.nome}</p>
            </div>
          )}

          <div className="mx-auto w-full max-w-md shrink-0 space-y-2 text-center">
            <p className="text-xs text-muted-foreground">{pool.length} número(s) concorrendo a este prêmio.</p>
            {display === null || spinning ? (
              <Button variant="gold" size="lg" className="h-12 w-full" disabled={spinning} onClick={girar}><Dices /> {spinning ? "Girando…" : "Girar roleta"}</Button>
            ) : (
              <Button size="lg" className="h-12 w-full" onClick={() => setRoletaOpen(false)}><CheckCircle2 /> Continuar apuração</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!homologado && !spinning && (
        <div className="flex gap-2">
          {ganhadores.length > 0 && <Button variant="outline" className="flex-1" onClick={() => { setGanhadores([]); setDisplay(null); }}>Refazer tudo</Button>}
          <Button className="flex-1" disabled={!completos} onClick={homologar}><Trophy /> Homologar e salvar ganhadores</Button>
        </div>
      )}
      {homologado && <p className="text-center text-sm text-muted-foreground">Resultado homologado e publicado na vitrine.</p>}
    </div>
  );
}
