import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";

const W = 1200;
const H = 630;
const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;

/** Converte qualquer imagem que o navegador consiga abrir para JPEG 1200x630 (recorte central). */
async function converterParaBanner(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Formato de imagem não suportado neste aparelho."));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const escala = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * escala;
    const dh = img.naturalHeight * escala;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    for (const q of [0.85, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && (blob.size < 500_000 || q === 0.6)) return blob;
    }
    throw new Error("Falha ao converter imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CapaUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const enviar = async (file: File) => {
    setBusy(true);
    try {
      const blob = await converterParaBanner(file);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Faça login para enviar a imagem.");
      const path = `${u.user.id}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("sorteios-capas").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const s = await supabase.storage.from("sorteios-capas").createSignedUrl(path, DEZ_ANOS);
      if (s.error) throw s.error;
      onChange(s.data.signedUrl);
      toast.success("Imagem pronta para o banner!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar imagem.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
      {value ? (
        <div className="relative">
          <img src={value} alt="Capa" className="aspect-[1200/630] w-full rounded-xl border object-cover" />
          <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2" onClick={() => onChange(null)}><X /></Button>
        </div>
      ) : null}
      <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {busy ? "Convertendo..." : value ? "Trocar imagem" : "Enviar imagem da galeria"}
      </Button>
      <p className="text-xs text-muted-foreground">Qualquer formato é convertido para JPG 1200×630, ideal para o banner do WhatsApp.</p>
    </div>
  );
}
