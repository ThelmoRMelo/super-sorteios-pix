export type Ganhador = { premio_idx: number; premio_nome: string; numero: number; nome: string };
export type Venda = { numero: number; comprador_nome: string };

export function rangeNumeros(ini: number, fim: number): number[] {
  const out: number[] = [];
  for (let n = ini; n <= fim; n++) out.push(n);
  return out;
}

export function padNumero(n: number, fim: number): string {
  return String(n).padStart(String(fim).length, "0");
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Adds Brazil country code when missing. */
export function normalizeWhatsapp(s: string): string {
  const d = onlyDigits(s);
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${normalizeWhatsapp(phone)}?text=${encodeURIComponent(text)}`;
}

export function mensagemCompra(opts: {
  sorteio: string;
  numeros: number[];
  fim: number;
  preco: number;
  nome: string;
  url: string;
}): string {
  const nums = [...opts.numeros].sort((a, b) => a - b).map((n) => padNumero(n, opts.fim));
  return [
    `Olá! Quero participar do sorteio *${opts.sorteio}*.`,
    `Nome: ${opts.nome}`,
    `Números: ${nums.join(", ")}`,
    `Total: ${formatBRL(nums.length * opts.preco)}`,
    opts.url,
  ].join("\n");
}

/** Sold numbers still eligible for the next prize. */
export function elegiveis(vendas: Venda[], ganhadores: Ganhador[], premioUnico: boolean): Venda[] {
  const numerosSorteados = new Set(ganhadores.map((g) => g.numero));
  const nomes = new Set(ganhadores.map((g) => g.nome.trim().toLowerCase()));
  return vendas.filter(
    (v) =>
      !numerosSorteados.has(v.numero) &&
      (!premioUnico || !nomes.has(v.comprador_nome.trim().toLowerCase())),
  );
}

export function randomIndex(len: number, rand: () => number = secureRandom): number {
  return Math.floor(rand() * len);
}

function secureRandom(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] ?? 0) / 2 ** 32;
}
