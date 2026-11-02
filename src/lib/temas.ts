import type { CSSProperties } from "react";

export type TemaPresetId =
  | "esmeralda"
  | "preto_dourado"
  | "roxo_violeta"
  | "azul_ciano"
  | "vermelho_rubi"
  | "claro_champagne"
  | "customizado";

export interface TemaConfig {
  preset: TemaPresetId;
  corPrimaria: string;
  corSecundaria: string;
  gradienteHero?: string;
}

export const TEMAS_PRESETS: Array<Omit<TemaConfig, "gradienteHero"> & { nome: string }> = [
  { preset: "esmeralda", nome: "Esmeralda", corPrimaria: "#0d5c3a", corSecundaria: "#f1c40f" },
  { preset: "preto_dourado", nome: "Preto & dourado", corPrimaria: "#171717", corSecundaria: "#d4af37" },
  { preset: "roxo_violeta", nome: "Roxo violeta", corPrimaria: "#54278f", corSecundaria: "#f2c94c" },
  { preset: "azul_ciano", nome: "Azul & ciano", corPrimaria: "#123b74", corSecundaria: "#22d3ee" },
  { preset: "vermelho_rubi", nome: "Vermelho rubi", corPrimaria: "#8f1738", corSecundaria: "#f4c95d" },
  { preset: "claro_champagne", nome: "Champagne", corPrimaria: "#6f4e37", corSecundaria: "#e8cfa5" },
];

const HEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const PRESETS = new Set<TemaPresetId>(TEMAS_PRESETS.map((t) => t.preset));

function isTemaConfig(value: unknown): value is TemaConfig {
  if (!value || typeof value !== "object") return false;
  const tema = value as Partial<TemaConfig>;
  return (PRESETS.has(tema.preset as TemaPresetId) || tema.preset === "customizado") &&
    typeof tema.corPrimaria === "string" && HEX.test(tema.corPrimaria) &&
    typeof tema.corSecundaria === "string" && HEX.test(tema.corSecundaria) &&
    (tema.gradienteHero === undefined || typeof tema.gradienteHero === "string");
}

function rgb(hex: string) {
  const value = hex.slice(1);
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function foreground(hex: string) {
  const [r, g, b] = rgb(hex).map((n) => {
    const c = n / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.42 ? "#18211c" : "#fffdf7";
}

export function gerarVariaveisCSSTema(tema: unknown): CSSProperties {
  if (!isTemaConfig(tema)) return {};
  const [r, g, b] = rgb(tema.corPrimaria);
  const hero = tema.gradienteHero ?? `radial-gradient(120% 90% at 85% 0%, color-mix(in srgb, ${tema.corPrimaria} 78%, white) 0%, ${tema.corPrimaria} 55%, rgb(${Math.round(r * 0.42)}, ${Math.round(g * 0.42)}, ${Math.round(b * 0.42)}) 100%)`;
  const style: Record<string, string> = {
    "--primary": tema.corPrimaria,
    "--primary-foreground": foreground(tema.corPrimaria),
    "--accent": tema.corSecundaria,
    "--accent-foreground": foreground(tema.corSecundaria),
    "--gradient-hero": hero,
    "--gradient-gold": `linear-gradient(135deg, color-mix(in srgb, ${tema.corSecundaria} 78%, white), ${tema.corSecundaria})`,
    "--shadow-ticket": `0 18px 40px -18px rgba(${r}, ${g}, ${b}, 0.45)`,
  };
  return style as CSSProperties;
}

