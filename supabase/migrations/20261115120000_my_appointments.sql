-- =====================================================================
--  PURAZI Studio — "Meus agendamentos" (rodar DEPOIS do hardening)
--
--  Como usar: SQL Editor -> New query -> colar este arquivo inteiro -> Run.
--  Pode rodar mais de uma vez; não altera nada existente.
--
--  O que faz: quem informa um código VÁLIDO + o WhatsApp da reserva passa a
--  ver, na mesma consulta, todos os agendamentos futuros confirmados desse
--  WhatsApp (não só o do código digitado).
--  Mantém o mesmo limite de tentativas erradas do hardening (8 em 15 min).
-- =====================================================================

create or replace function public.list_my_appointments(p_code text, p_phone text)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  a   public.appointments;
  ph  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  res jsonb;
begin
  perform public._attempt_guard(ph);

  select * into a from public.appointments
   where upper(code) = upper(btrim(coalesce(p_code, ''))) and client_phone = ph
   order by day desc, start_time desc limit 1;

  -- não achou: registra a tentativa errada e devolve null (sem exceção, para o contador valer)
  if not found then
    perform public._attempt_fail(ph);
    return null;
  end if;
  perform public._attempt_ok(ph);

  -- demais agendamentos futuros confirmados do mesmo WhatsApp (no máximo 10)
  select coalesce(jsonb_agg(public._appt_json(x) order by x.day, x.start_time), '[]'::jsonb)
    into res
    from (
      select * from public.appointments
       where client_phone = ph
         and status = 'confirmed'
         and id <> a.id
         and (day + start_time) >= public._br_now()
       order by day, start_time
       limit 10
    ) x;

  -- 1º item = o agendamento do código digitado (em qualquer status); depois os outros
  return jsonb_build_array(public._appt_json(a)) || res;
end;
$$;

-- permissões: só esta função fica aberta ao site
revoke execute on function public.list_my_appointments(text, text) from public, anon, authenticated;
grant  execute on function public.list_my_appointments(text, text) to anon, authenticated;
