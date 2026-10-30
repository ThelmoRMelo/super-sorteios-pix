import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const PUBLIC_COLS =
  "id,nome,descricao,numero_inicial,numero_final,preco_unitario,whatsapp,premios_lista,regras,status,imagem_url,sorteado_em,premio_unico_por_participante,ganhadores_lista";

export const listSorteiosPublicos = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("sorteios")
    .select(PUBLIC_COLS)
    .in("status", ["publicado", "encerrado"])
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSorteioPublico = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = publicClient();
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) return null;
    const { data: s } = await sb.from("sorteios").select(PUBLIC_COLS).eq("id", data.id).maybeSingle();
    if (!s) return null;
    const { data: vendidos } = await sb.rpc("numeros_vendidos", { _sorteio_id: data.id });
    return { sorteio: s, vendidos: (vendidos ?? []) as number[] };
  });
