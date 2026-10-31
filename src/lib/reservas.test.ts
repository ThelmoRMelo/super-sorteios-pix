import { describe, expect, it } from "vitest";
import { reservaAtiva, reservaInput } from "./reservas";

const input = { sorteioId: "80fbef79-ca2b-44a3-9af5-8dba22d1b5a4", pedidoId: "80fbef79-ca2b-44a3-9af5-8dba22d1b5a5", numeros: [2, 2, 1], nome: "Ana", telefone: "85999991234" };
describe("reservas", () => {
  it("normaliza números sem duplicidade", () => expect(reservaInput.parse(input).numeros).toEqual([1, 2]));
  it("uma reserva expirada não bloqueia números", () => expect(reservaAtiva({ status: "pendente", expires_at: "2026-10-31T00:30:00Z" }, Date.parse("2026-10-31T00:30:00Z"))).toBe(false));
  it("uma reserva pendente ainda válida bloqueia números", () => expect(reservaAtiva({ status: "pendente", expires_at: "2026-10-31T00:30:00Z" }, Date.parse("2026-10-31T00:29:59Z"))).toBe(true));
  it("pedidos cancelados não bloqueiam números", () => expect(reservaAtiva({ status: "cancelado", expires_at: "2026-10-31T00:30:00Z" }, Date.parse("2026-10-31T00:20:00Z"))).toBe(false));
});