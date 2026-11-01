import { describe, expect, it } from "vitest";
import { gerarVariaveisCSSTema, TEMAS_PRESETS } from "@/lib/temas";

describe("gerarVariaveisCSSTema", () => {
  it("preserva o tema padrão quando o valor é null ou undefined", () => {
    expect(gerarVariaveisCSSTema(null)).toEqual({});
    expect(gerarVariaveisCSSTema(undefined)).toEqual({});
  });

  it("usa as cores declaradas em cada preset oficial", () => {
    for (const tema of TEMAS_PRESETS) {
      const css = gerarVariaveisCSSTema(tema) as Record<string, string>;
      expect(css["--primary"]).toBe(tema.corPrimaria);
      expect(css["--accent"]).toBe(tema.corSecundaria);
    }
  });

  it("gera gradientes e sombra para cores customizadas", () => {
    const css = gerarVariaveisCSSTema({ preset: "customizado", corPrimaria: "#123456", corSecundaria: "#abcdef" }) as Record<string, string>;
    expect(css["--primary"]).toBe("#123456");
    expect(css["--accent"]).toBe("#abcdef");
    expect(css["--gradient-hero"]).toContain("#123456");
    expect(css["--gradient-gold"]).toContain("#abcdef");
    expect(css["--shadow-ticket"]).toContain("rgba(18, 52, 86");
  });

  it("ignora configurações inválidas", () => {
    expect(gerarVariaveisCSSTema({ preset: "customizado", corPrimaria: "red", corSecundaria: "#fff" })).toEqual({});
  });
});
