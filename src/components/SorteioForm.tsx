import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

export type SorteioInput = {
  nome: string;
  descricao: string;
  numero_inicial: number;
  numero_final: number;
  preco_unitario: number;
  whatsapp: string;
  premios_lista: string[];
  regras: string;
  imagem_url: string | null;
  premio_unico_por_participante: boolean;
};

export const vazio: SorteioInput = {
  nome: "",
  descricao: "",
  numero_inicial: 1,
  numero_final: 100,
  preco_unitario: 10,
  whatsapp: "",
  premios_lista: [""],
  regras: "",
  imagem_url: null,
  premio_unico_por_participante: false,
};

export function SorteioForm({
  initial,
  onSubmit,
  submitLabel,
  lockRange,
}: {
  initial: SorteioInput;
  onSubmit: (v: SorteioInput) => Promise<void>;
  submitLabel: string;
  lockRange?: boolean;
}) {
  const [v, setV] = useState<SorteioInput>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SorteioInput>(k: K, val: SorteioInput[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit({ ...v, premios_lista: v.premios_lista.map((p) => p.trim()).filter(Boolean) });
        setBusy(false);
      }}
    >
      <Field label="Nome do sorteio"><Input required maxLength={120} value={v.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
      <Field label="Descrição"><Textarea maxLength={2000} value={v.descricao} onChange={(e) => set("descricao", e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Nº inicial"><Input type="number" required disabled={lockRange} value={v.numero_inicial} onChange={(e) => set("numero_inicial", +e.target.value)} /></Field>
        <Field label="Nº final"><Input type="number" required disabled={lockRange} value={v.numero_final} onChange={(e) => set("numero_final", +e.target.value)} /></Field>
        <Field label="Preço (R$)"><Input type="number" step="0.01" min="0" required value={v.preco_unitario} onChange={(e) => set("preco_unitario", +e.target.value)} /></Field>
      </div>
      <Field label="WhatsApp para pedidos"><Input required placeholder="(85) 99999-0000" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
      <Field label="Link da imagem de capa (opcional)"><Input type="url" placeholder="https://..." value={v.imagem_url ?? ""} onChange={(e) => set("imagem_url", e.target.value || null)} /></Field>

      <div>
        <Label>Prêmios (até 30)</Label>
        <div className="mt-2 space-y-2">
          {v.premios_lista.map((p, i) => (
            <div key={i} className="flex gap-2">
              <span className="grid w-9 shrink-0 place-items-center font-display font-bold text-primary">{i + 1}º</span>
              <Input required={i === 0} value={p} onChange={(e) => set("premios_lista", v.premios_lista.map((x, j) => (j === i ? e.target.value : x)))} />
              {v.premios_lista.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => set("premios_lista", v.premios_lista.filter((_, j) => j !== i))}><X /></Button>
              )}
            </div>
          ))}
          {v.premios_lista.length < 30 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set("premios_lista", [...v.premios_lista, ""])}><Plus /> Adicionar prêmio</Button>
          )}
        </div>
      </div>

      <Field label="Regras"><Textarea value={v.regras} onChange={(e) => set("regras", e.target.value)} /></Field>
      <label className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3 text-sm">
        <span><b>Prêmio único por participante</b><br /><span className="text-muted-foreground">Quem já ganhou não concorre aos próximos prêmios.</span></span>
        <Switch checked={v.premio_unico_por_participante} onCheckedChange={(c) => set("premio_unico_por_participante", c)} />
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{submitLabel}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
