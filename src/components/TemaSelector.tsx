import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEMAS_PRESETS, type TemaConfig, type TemaPresetId } from "@/lib/temas";

const HEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const PADRAO = TEMAS_PRESETS[0];

export function TemaSelector({ value, onChange }: { value: TemaConfig | null; onChange: (tema: TemaConfig | null) => void }) {
  const [custom, setCustom] = useState(value?.preset === "customizado");
  const [primaria, setPrimaria] = useState(value?.corPrimaria ?? "#0d5c3a");
  const [secundaria, setSecundaria] = useState(value?.corSecundaria ?? "#f1c40f");
  const [primariaTexto, setPrimariaTexto] = useState(primaria);
  const [secundariaTexto, setSecundariaTexto] = useState(secundaria);

  useEffect(() => {
    if (value?.preset === "customizado") {
      setCustom(true); setPrimaria(value.corPrimaria); setSecundaria(value.corSecundaria);
      setPrimariaTexto(value.corPrimaria); setSecundariaTexto(value.corSecundaria);
    } else setCustom(false);
  }, [value]);

  function pick(preset: TemaPresetId, corPrimaria: string, corSecundaria: string) {
    setCustom(false);
    onChange({ preset, corPrimaria, corSecundaria });
  }

  function updateColor(which: "primaria" | "secundaria", color: string) {
    const valid = which === "primaria" ? setPrimaria : setSecundaria;
    const setText = which === "primaria" ? setPrimariaTexto : setSecundariaTexto;
    valid(color); setText(color);
    const nextPrimary = which === "primaria" ? color : primaria;
    const nextSecondary = which === "secundaria" ? color : secundaria;
    if (HEX.test(nextPrimary) && HEX.test(nextSecondary)) onChange({ preset: "customizado", corPrimaria: nextPrimary, corSecundaria: nextSecondary });
  }

  const previewPrimary = custom ? primaria : value?.corPrimaria ?? PADRAO.corPrimaria;
  const previewAccent = custom ? secundaria : value?.corSecundaria ?? PADRAO.corSecundaria;

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4" aria-labelledby="tema-heading">
      <div><h3 id="tema-heading" className="font-display text-lg font-bold">Personalização Visual / Tema</h3><p className="text-sm text-muted-foreground">Escolha as cores da vitrine deste sorteio.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TEMAS_PRESETS.map((tema) => {
          const selected = !custom && (value?.preset === tema.preset || (value === null && tema.preset === "esmeralda"));
          return <button key={tema.preset} type="button" aria-pressed={selected} onClick={() => pick(tema.preset, tema.corPrimaria, tema.corSecundaria)} className={`rounded-xl border p-3 text-left transition hover:border-primary ${selected ? "border-primary ring-2 ring-primary/20" : ""}`}>
            <span className="flex items-center justify-between gap-2"><b className="text-sm">{tema.nome}</b>{selected && <Check className="size-4 text-primary" />}</span>
            <span className="mt-2 flex gap-1.5"><i className="size-5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: tema.corPrimaria }} /><i className="size-5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: tema.corSecundaria }} /></span>
          </button>;
        })}
        <button type="button" aria-pressed={custom} onClick={() => { const p = value?.corPrimaria ?? PADRAO.corPrimaria; const a = value?.corSecundaria ?? PADRAO.corSecundaria; setPrimaria(p); setPrimariaTexto(p); setSecundaria(a); setSecundariaTexto(a); setCustom(true); onChange({ preset: "customizado", corPrimaria: p, corSecundaria: a }); }} className={`rounded-xl border p-3 text-left transition hover:border-primary ${custom ? "border-primary ring-2 ring-primary/20" : ""}`}><b className="text-sm">Personalizado</b><span className="mt-2 block text-xs text-muted-foreground">Defina suas próprias cores</span></button>
      </div>
      {custom && <div className="grid gap-3 sm:grid-cols-2">
        <ColorControl label="Cor primária" color={primaria} text={primariaTexto} onText={(text) => { setPrimariaTexto(text); if (HEX.test(text)) updateColor("primaria", text); }} onColor={(color) => updateColor("primaria", color)} />
        <ColorControl label="Cor secundária" color={secundaria} text={secundariaTexto} onText={(text) => { setSecundariaTexto(text); if (HEX.test(text)) updateColor("secundaria", text); }} onColor={(color) => updateColor("secundaria", color)} />
      </div>}
      <div className="overflow-hidden rounded-xl border">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: `linear-gradient(120deg, ${previewPrimary}, color-mix(in srgb, ${previewPrimary} 65%, black))` }}><b>Prévia do cabeçalho</b><p className="text-sm opacity-80">Assim ficará a vitrine do sorteio</p></div>
        <div className="flex items-center justify-between gap-3 p-3"><span className="text-sm text-muted-foreground">Botão de destaque</span><span className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: previewAccent, color: "#18211c" }}>Participar</span></div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => { setCustom(false); onChange(null); }}>Restaurar padrão (Verde Esmeralda)</Button>
    </section>
  );
}

function ColorControl({ label, color, text, onText, onColor }: { label: string; color: string; text: string; onText: (value: string) => void; onColor: (value: string) => void }) {
  const valid = HEX.test(text);
  return <div className="space-y-1.5"><Label>{label}</Label><div className="flex gap-2"><Input aria-label={`${label} seletor`} type="color" value={valid ? text : color} onChange={(e) => onColor(e.target.value)} className="h-10 w-14 cursor-pointer p-1"/><Input aria-label={`${label} hexadecimal`} value={text} aria-invalid={!valid} onChange={(e) => onText(e.target.value)} placeholder="#0d5c3a"/><span className="sr-only">Informe um hexadecimal como #0d5c3a</span></div>{!valid && <p className="text-xs text-destructive">Use o formato #RGB ou #RRGGBB.</p>}</div>;
}
