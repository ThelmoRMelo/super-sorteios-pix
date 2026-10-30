import { describe, expect, it } from "vitest";
import { elegiveis, normalizeWhatsapp, mensagemCompra } from "./sorteio-logic";

const vendas = [
  { numero: 1, comprador_nome: "Ana" },
  { numero: 2, comprador_nome: "ana " },
  { numero: 3, comprador_nome: "Bruno" },
];
const g = [{ premio_idx: 0, premio_nome: "TV", numero: 1, nome: "Ana" }];

describe("sorteio rules", () => {
  it("never draws an already drawn number", () => {
    expect(elegiveis(vendas, g, false).map((v) => v.numero)).toEqual([2, 3]);
  });
  it("prêmio único excludes a buyer who already won", () => {
    expect(elegiveis(vendas, g, true).map((v) => v.numero)).toEqual([3]);
  });
  it("adds Brazil code to local WhatsApp numbers", () => {
    expect(normalizeWhatsapp("(85) 99999-1234")).toBe("5585999991234");
  });
  it("totals price by number count", () => {
    expect(mensagemCompra({ sorteio: "X", numeros: [5, 2], fim: 100, preco: 10, nome: "A", url: "u" })).toContain("002, 005");
  });
});
