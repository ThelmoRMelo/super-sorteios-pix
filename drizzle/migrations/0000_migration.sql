CREATE TABLE public.sorteios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  numero_inicial INTEGER NOT NULL DEFAULT 1,
  numero_final INTEGER NOT NULL DEFAULT 100,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 10.00,
  whatsapp TEXT NOT NULL,
  premios_lista JSONB NOT NULL DEFAULT '[]'::jsonb,
  regras TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'preparacao' CHECK (status IN ('preparacao','publicado','encerrado','cancelado')),
  imagem_url TEXT,
  sorteado_em TIMESTAMPTZ,
  premio_unico_por_participante BOOLEAN NOT NULL DEFAULT false,
  ganhadores_lista JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (numero_final >= numero_inicial AND numero_final - numero_inicial < 10000)
);
GRANT SELECT ON public.sorteios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sorteios TO authenticated;
GRANT ALL ON public.sorteios TO service_role;
ALTER TABLE public.sorteios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published" ON public.sorteios FOR SELECT USING (status <> 'preparacao' OR owner_id = auth.uid());
CREATE POLICY "owner insert" ON public.sorteios FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner update" ON public.sorteios FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner delete" ON public.sorteios FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.sorteio_numeros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteio_id UUID NOT NULL REFERENCES public.sorteios(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  comprador_nome TEXT NOT NULL,
  comprador_telefone TEXT NOT NULL DEFAULT '',
  observacao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sorteio_numero UNIQUE (sorteio_id, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sorteio_numeros TO authenticated;
GRANT ALL ON public.sorteio_numeros TO service_role;
ALTER TABLE public.sorteio_numeros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all numeros" ON public.sorteio_numeros FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sorteios s WHERE s.id = sorteio_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sorteios s WHERE s.id = sorteio_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.numeros_vendidos(_sorteio_id uuid)
RETURNS SETOF integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.numero FROM public.sorteio_numeros n
  JOIN public.sorteios s ON s.id = n.sorteio_id
  WHERE n.sorteio_id = _sorteio_id AND (s.status <> 'preparacao' OR s.owner_id = auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.numeros_vendidos(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER sorteios_touch BEFORE UPDATE ON public.sorteios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "sorteios img upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sorteios' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sorteios img update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'sorteios' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sorteios img delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sorteios' AND (storage.foldername(name))[1] = auth.uid()::text);