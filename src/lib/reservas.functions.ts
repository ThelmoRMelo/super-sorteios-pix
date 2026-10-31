import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { reservaInput, type ReservaRecibo } from "./reservas";

export const criarReserva = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reservaInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const { data: recibo, error } = await sb.rpc("reservar_numeros", {
      _sorteio_id: data.sorteioId, _pedido_id: data.pedidoId, _numeros: data.numeros,
      _nome: data.nome, _telefone: data.telefone,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, recibo: recibo as ReservaRecibo };
  });