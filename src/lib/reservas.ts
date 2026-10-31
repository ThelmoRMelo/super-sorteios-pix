import { z } from "zod";

export const reservaInput = z.object({
  sorteioId: z.string().uuid(),
  pedidoId: z.string().uuid(),
  numeros: z.array(z.number().int()).min(1).max(100).transform((ns) => [...new Set(ns)].sort((a, b) => a - b)),
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().min(10).max(15)),
});

export type ReservaRecibo = { id: string; expires_at: string; preco_unitario: number };
export function reservaAtiva(r: { status: string; expires_at: string }, now = Date.now()) {
  return r.status === "pendente" && new Date(r.expires_at).getTime() > now;
}