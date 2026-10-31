CREATE TABLE public.sorteio_reservas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sorteio_id uuid NOT NULL REFERENCES public.sorteios(id) ON DELETE CASCADE,
 numeros integer[] NOT NULL,
 comprador_nome text NOT NULL,
 comprador_telefone text NOT NULL DEFAULT '',
 preco_unitario numeric(12,2) NOT NULL,
 status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','cancelado')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);
GRANT SELECT ON public.sorteio_reservas TO authenticated;
GRANT ALL ON public.sorteio_reservas TO service_role;
ALTER TABLE public.sorteio_reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read reservas" ON public.sorteio_reservas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sorteios s WHERE s.id = sorteio_id AND s.owner_id = auth.uid()));
CREATE INDEX reservas_pending ON public.sorteio_reservas(sorteio_id, expires_at) WHERE status = 'pendente';

CREATE OR REPLACE FUNCTION public.reservar_numeros(_sorteio_id uuid, _pedido_id uuid, _numeros integer[], _nome text, _telefone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sorteios; r public.sorteio_reservas; ns integer[];
BEGIN
 SELECT * INTO s FROM public.sorteios WHERE id = _sorteio_id FOR UPDATE;
 IF NOT FOUND OR s.status <> 'publicado' THEN RAISE EXCEPTION 'Este sorteio não está aberto.'; END IF;
 SELECT array_agg(DISTINCT n ORDER BY n) INTO ns FROM unnest(_numeros) n;
 IF ns IS NULL OR cardinality(ns) > 100 OR array_position(ns, NULL) IS NOT NULL OR EXISTS (SELECT 1 FROM unnest(ns) n WHERE n < s.numero_inicial OR n > s.numero_final) THEN RAISE EXCEPTION 'Escolha de 1 a 100 números válidos.'; END IF;
 IF length(trim(_nome)) NOT BETWEEN 2 AND 120 OR _nome IS NULL OR length(regexp_replace(_telefone, '\D', '', 'g')) NOT BETWEEN 10 AND 15 OR _telefone IS NULL THEN RAISE EXCEPTION 'Informe nome e telefone válidos.'; END IF;
 SELECT * INTO r FROM public.sorteio_reservas WHERE id = _pedido_id;
 IF FOUND THEN
  IF r.sorteio_id = _sorteio_id AND r.numeros = ns AND r.comprador_nome = trim(_nome) AND r.comprador_telefone = regexp_replace(_telefone, '\D', '', 'g') AND r.status = 'pendente' AND r.expires_at > now() THEN
   RETURN jsonb_build_object('id', r.id, 'expires_at', r.expires_at, 'preco_unitario', r.preco_unitario);
  END IF;
  RAISE EXCEPTION 'Este pedido já foi utilizado. Faça uma nova reserva.';
 END IF;
 IF EXISTS (SELECT 1 FROM public.sorteio_numeros WHERE sorteio_id = s.id AND numero = ANY(ns)) OR EXISTS (SELECT 1 FROM public.sorteio_reservas WHERE sorteio_id = s.id AND status = 'pendente' AND expires_at > now() AND numeros && ns) THEN RAISE EXCEPTION 'Algum número acabou de ser vendido ou reservado. Escolha novamente.'; END IF;
 IF (SELECT count(*) FROM public.sorteio_reservas WHERE sorteio_id = s.id AND comprador_telefone = regexp_replace(_telefone, '\D', '', 'g') AND status = 'pendente' AND expires_at > now()) >= 3 THEN RAISE EXCEPTION 'Você já possui três pedidos pendentes neste sorteio.'; END IF;
 INSERT INTO public.sorteio_reservas(id, sorteio_id, numeros, comprador_nome, comprador_telefone, preco_unitario) VALUES (_pedido_id, s.id, ns, trim(_nome), regexp_replace(_telefone, '\D', '', 'g'), s.preco_unitario) RETURNING * INTO r;
 RETURN jsonb_build_object('id', r.id, 'expires_at', r.expires_at, 'preco_unitario', r.preco_unitario);
END $$;
REVOKE ALL ON FUNCTION public.reservar_numeros(uuid,uuid,integer[],text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_numeros(uuid,uuid,integer[],text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.numeros_reservados(_sorteio_id uuid)
RETURNS SETOF integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT DISTINCT unnest(r.numeros) FROM public.sorteio_reservas r JOIN public.sorteios s ON s.id = r.sorteio_id WHERE r.sorteio_id = _sorteio_id AND r.status = 'pendente' AND r.expires_at > now() AND s.status = 'publicado'
$$;
REVOKE ALL ON FUNCTION public.numeros_reservados(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.numeros_reservados(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolver_reserva(_pedido_id uuid, _confirmar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.sorteio_reservas; s public.sorteios; sid uuid;
BEGIN
 SELECT sorteio_id INTO sid FROM public.sorteio_reservas WHERE id = _pedido_id;
 SELECT * INTO s FROM public.sorteios WHERE id = sid FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR s.owner_id <> auth.uid() THEN RAISE EXCEPTION 'Pedido não encontrado ou acesso negado.'; END IF;
 SELECT * INTO r FROM public.sorteio_reservas WHERE id = _pedido_id FOR UPDATE;
 IF r.status = 'confirmado' AND _confirmar THEN RETURN; END IF;
 IF r.status <> 'pendente' THEN RAISE EXCEPTION 'Este pedido já foi finalizado.'; END IF;
 IF _confirmar THEN
  IF r.expires_at <= now() THEN RAISE EXCEPTION 'Reserva expirada. Os números precisam ser escolhidos novamente.'; END IF;
  IF s.status <> 'publicado' THEN RAISE EXCEPTION 'Reabra o sorteio antes de confirmar o pagamento.'; END IF;
  UPDATE public.sorteio_reservas SET status = 'confirmado' WHERE id = r.id;
  INSERT INTO public.sorteio_numeros(sorteio_id, numero, comprador_nome, comprador_telefone, observacao) SELECT r.sorteio_id, n, r.comprador_nome, r.comprador_telefone, 'Pedido ' || r.id::text FROM unnest(r.numeros) n;
 ELSE
  UPDATE public.sorteio_reservas SET status = 'cancelado' WHERE id = r.id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.resolver_reserva(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolver_reserva(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_baixa_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.sorteios;
BEGIN
 SELECT * INTO s FROM public.sorteios WHERE id = NEW.sorteio_id FOR UPDATE;
 IF s.status IN ('encerrado','cancelado') THEN RAISE EXCEPTION 'Este sorteio está encerrado ou cancelado.'; END IF;
 IF NEW.numero < s.numero_inicial OR NEW.numero > s.numero_final THEN RAISE EXCEPTION 'Número fora do intervalo.'; END IF;
 IF EXISTS (SELECT 1 FROM public.sorteio_reservas WHERE sorteio_id = NEW.sorteio_id AND status = 'pendente' AND expires_at > now() AND NEW.numero = ANY(numeros)) THEN RAISE EXCEPTION 'Número reservado. Confirme o pedido correspondente na lista de reservas.'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validar_baixa_reserva() FROM PUBLIC;
CREATE TRIGGER proteger_baixa BEFORE INSERT OR UPDATE ON public.sorteio_numeros FOR EACH ROW EXECUTE FUNCTION public.validar_baixa_reserva();