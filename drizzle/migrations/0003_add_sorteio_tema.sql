ALTER TABLE public.sorteios ADD COLUMN IF NOT EXISTS tema jsonb DEFAULT NULL;
COMMENT ON COLUMN public.sorteios.tema IS 'Tema visual opcional da vitrine: {"preset": string, "cores": {...}}. NULL = tema padrão esmeralda.';
ALTER TABLE public.sorteios ADD CONSTRAINT sorteios_tema_objeto CHECK (tema IS NULL OR jsonb_typeof(tema) = 'object');