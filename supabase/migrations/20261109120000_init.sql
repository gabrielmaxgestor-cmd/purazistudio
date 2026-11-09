-- =====================================================================
--  PURAZI Studio — banco de dados (Supabase / PostgreSQL)
--
--  Como usar: no painel do Supabase abra  SQL Editor  ->  New query,
--  cole este arquivo inteiro e clique em  Run.
--
--  Segurança em resumo:
--   * Todas as tabelas têm RLS ligado e NENHUMA policy: ninguém lê/escreve
--     direto nas tabelas (nem com a chave pública "anon").
--   * O site só conversa com o banco por FUNÇÕES (RPC) que validam tudo:
--       - públicas  : horários livres, criar/consultar/cancelar/remarcar
--                     (consulta exige código + telefone do cliente)
--       - do barbeiro: só funcionam se o usuário logado estiver na
--                     tabela "admins" (função is_admin()).
--   * Choque de horários é impedido pelo próprio banco (EXCLUDE constraint),
--     então dois clientes nunca conseguem o mesmo horário, mesmo clicando juntos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Administradores (barbeiros com acesso ao painel)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2) Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id               text primary key,
  name             text not null check (char_length(name) between 1 and 80),
  description      text check (char_length(description) <= 300),
  price            numeric(10, 2) not null check (price >= 0 and price <= 100000),
  duration_minutes int  not null check (duration_minutes between 5 and 480),
  category         text not null default 'outro'
                   check (category in ('cabelo', 'barba', 'combo', 'visagismo', 'outro')),
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.barber_settings (
  id               int primary key default 1 check (id = 1),     -- linha única
  work_start       time not null default '09:00',
  work_end         time not null default '20:00',
  interval_minutes int  not null default 45 check (interval_minutes between 5 and 240),
  fixed_off_days   int[] not null default '{0}',                 -- 0 = domingo ... 6 = sábado
  day_schedules    jsonb not null default '{}'::jsonb,           -- {"6": {"start":"09:00","end":"14:00"}}
  updated_at       timestamptz not null default now()
);

create table if not exists public.blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  start_time time,                         -- null => dia inteiro
  end_time   time,                         -- null (com start_time) => bloqueia 1 intervalo
  reason     text not null default '' check (char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  check (end_time is null or start_time is not null),
  check (end_time is null or end_time > start_time)
);
create index if not exists blocked_slots_day_idx on public.blocked_slots (day);

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  client_name      text not null check (char_length(client_name) between 2 and 80),
  client_phone     text not null check (client_phone ~ '^[0-9]{10,11}$'),
  service_id       text references public.services (id) on delete set null,
  service_name     text not null,
  price            numeric(10, 2) not null,
  duration_minutes int  not null check (duration_minutes between 5 and 480),
  day              date not null,
  start_time       time not null,
  status           text not null default 'confirmed'
                   check (status in ('confirmed', 'completed', 'cancelled')),
  created_at       timestamptz not null default now(),
  -- intervalo ocupado (usado para impedir choques)
  during           tsrange generated always as (
                     tsrange(day + start_time,
                             day + start_time + make_interval(mins => duration_minutes))
                   ) stored,
  constraint appointments_no_overlap exclude using gist (during with &&)
    where (status <> 'cancelled')
);
create index if not exists appointments_day_idx   on public.appointments (day);
create index if not exists appointments_phone_idx on public.appointments (client_phone);
create index if not exists appointments_code_idx  on public.appointments (code);

-- ---------------------------------------------------------------------
-- 3) Bloqueio total das tabelas (RLS ligado, sem policies)
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.services        enable row level security;
alter table public.barber_settings enable row level security;
alter table public.blocked_slots   enable row level security;
alter table public.appointments    enable row level security;

revoke all on public.admins, public.services, public.barber_settings,
              public.blocked_slots, public.appointments
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) Funções auxiliares (internas — não ficam expostas ao site)
-- ---------------------------------------------------------------------
create or replace function public._mins(t time)
returns int language sql immutable as $$
  select (extract(hour from t) * 60 + extract(minute from t))::int;
$$;

create or replace function public._br_now()
returns timestamp language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo');
$$;

create or replace function public._fail(code text)
returns void language plpgsql as $$
begin
  raise exception '%', code using errcode = 'P0001';
end;
$$;

create or replace function public._require_admin()
returns void language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- Expediente de um dia (folga fixa / horário reduzido). Retorna NULLs se for folga.
create or replace function public._day_hours(p_day date, out o_start time, out o_end time)
language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare
  s  public.barber_settings;
  wd int := extract(dow from p_day)::int;
  c  jsonb;
begin
  select * into s from public.barber_settings where id = 1;
  if wd = any (s.fixed_off_days) then
    o_start := null; o_end := null; return;
  end if;
  c := s.day_schedules -> wd::text;
  if c is not null and c ? 'start' and c ? 'end' then
    o_start := (c ->> 'start')::time; o_end := (c ->> 'end')::time;
  else
    o_start := s.work_start; o_end := s.work_end;
  end if;
end;
$$;

-- Formato JSON que o site já entende (camelCase)
create or replace function public._appt_json(a public.appointments)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', a.id, 'code', a.code,
    'clientName', a.client_name, 'clientPhone', a.client_phone,
    'serviceId', a.service_id, 'serviceName', a.service_name,
    'price', a.price, 'durationMinutes', a.duration_minutes,
    'dateStr', to_char(a.day, 'YYYY-MM-DD'), 'timeStr', to_char(a.start_time, 'HH24:MI'),
    'status', a.status, 'createdAt', a.created_at);
$$;

-- Valida se um horário pode receber um serviço (lança erro com um código legível)
create or replace function public._check_slot(p_day date, p_time time, p_duration int)
returns void language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare
  s     public.barber_settings;
  h     record;
  today date := public._br_now()::date;
  nowt  time := public._br_now()::time;
  st    int  := public._mins(p_time);
  en    int  := public._mins(p_time) + p_duration;
begin
  if p_day < today or p_day > today + 89 then perform public._fail('invalid_day'); end if;

  select * into s from public.barber_settings where id = 1;
  select * into h from public._day_hours(p_day);
  if h.o_start is null then perform public._fail('day_off'); end if;

  if st < public._mins(h.o_start) or (st - public._mins(h.o_start)) % s.interval_minutes <> 0 then
    perform public._fail('invalid_time');
  end if;
  if en > public._mins(h.o_end) then perform public._fail('outside_hours'); end if;
  if p_day = today and p_time <= nowt then perform public._fail('past_time'); end if;

  if exists (
    select 1 from public.blocked_slots b
    where b.day = p_day
      and (b.start_time is null
           or (public._mins(b.start_time) < en
               and coalesce(public._mins(b.end_time), public._mins(b.start_time) + s.interval_minutes) > st))
  ) then
    perform public._fail('blocked');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Funções PÚBLICAS (site dos clientes)
-- ---------------------------------------------------------------------

-- Tudo que o site precisa para montar a agenda — sem nenhum dado pessoal.
create or replace function public.get_public_data()
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare
  today date := public._br_now()::date;
  s public.barber_settings;
begin
  select * into s from public.barber_settings where id = 1;
  return jsonb_build_object(
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'name', v.name, 'description', v.description, 'price', v.price,
        'durationMinutes', v.duration_minutes, 'category', v.category) order by v.sort_order, v.name)
      from public.services v), '[]'::jsonb),
    'settings', jsonb_build_object(
      'workStart', to_char(s.work_start, 'HH24:MI'), 'workEnd', to_char(s.work_end, 'HH24:MI'),
      'intervalMinutes', s.interval_minutes, 'fixedOffDays', to_jsonb(s.fixed_off_days),
      'daySchedules', s.day_schedules),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dateStr', to_char(a.day, 'YYYY-MM-DD'), 'timeStr', to_char(a.start_time, 'HH24:MI'),
        'durationMinutes', a.duration_minutes))
      from public.appointments a
      where a.status <> 'cancelled' and a.day between today and today + 89), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'dateStr', to_char(b.day, 'YYYY-MM-DD'),
        'timeStr', to_char(b.start_time, 'HH24:MI'), 'endTimeStr', to_char(b.end_time, 'HH24:MI'),
        'reason', ''))
      from public.blocked_slots b where b.day >= today), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_appointment(
  p_service_id text, p_day date, p_time time, p_name text, p_phone text)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  v    public.services;
  ph   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  nm   text := btrim(coalesce(p_name, ''));
  cd   text;
  a    public.appointments;
  i    int := 0;
begin
  if char_length(nm) < 2 or char_length(nm) > 80 then perform public._fail('invalid_name'); end if;
  if ph !~ '^[0-9]{10,11}$' then perform public._fail('invalid_phone'); end if;

  select * into v from public.services where id = p_service_id;
  if not found then perform public._fail('invalid_service'); end if;

  perform public._check_slot(p_day, p_time, v.duration_minutes);

  -- antispam: no máximo 3 agendamentos futuros em aberto por telefone
  if (select count(*) from public.appointments
      where client_phone = ph and status = 'confirmed'
        and day >= public._br_now()::date) >= 3 then
    perform public._fail('too_many');
  end if;

  loop
    cd := 'PRZ-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when not exists (select 1 from public.appointments where code = cd and client_phone = ph);
    i := i + 1;
    if i > 20 then perform public._fail('code_error'); end if;
  end loop;

  begin
    insert into public.appointments
      (code, client_name, client_phone, service_id, service_name, price, duration_minutes, day, start_time)
    values (cd, nm, ph, v.id, v.name, v.price, v.duration_minutes, p_day, p_time)
    returning * into a;
  exception when exclusion_violation then
    perform public._fail('slot_taken');
  end;

  return public._appt_json(a);
end;
$$;

-- Consulta: exige código E telefone (ninguém consegue listar agendamentos de outras pessoas)
create or replace function public.lookup_appointment(p_code text, p_phone text)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare a public.appointments;
begin
  select * into a from public.appointments
   where upper(code) = upper(btrim(coalesce(p_code, '')))
     and client_phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
   order by day desc, start_time desc limit 1;
  if not found then return null; end if;
  return public._appt_json(a);
end;
$$;

create or replace function public.cancel_appointment(p_code text, p_phone text)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare a public.appointments;
begin
  select * into a from public.appointments
   where upper(code) = upper(btrim(coalesce(p_code, '')))
     and client_phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
   order by day desc, start_time desc limit 1;
  if not found then perform public._fail('not_found'); end if;
  if a.status <> 'confirmed' then perform public._fail('not_confirmed'); end if;
  if (a.day + a.start_time) - public._br_now() < interval '12 hours' then
    perform public._fail('too_late');
  end if;
  update public.appointments set status = 'cancelled' where id = a.id returning * into a;
  return public._appt_json(a);
end;
$$;

create or replace function public.reschedule_appointment(
  p_code text, p_phone text, p_day date, p_time time)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare a public.appointments;
begin
  select * into a from public.appointments
   where upper(code) = upper(btrim(coalesce(p_code, '')))
     and client_phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
   order by day desc, start_time desc limit 1;
  if not found then perform public._fail('not_found'); end if;
  if a.status <> 'confirmed' then perform public._fail('not_confirmed'); end if;
  if (a.day + a.start_time) - public._br_now() < interval '12 hours' then
    perform public._fail('too_late');
  end if;

  perform public._check_slot(p_day, p_time, a.duration_minutes);

  begin
    update public.appointments set day = p_day, start_time = p_time where id = a.id returning * into a;
  exception when exclusion_violation then
    perform public._fail('slot_taken');
  end;
  return public._appt_json(a);
end;
$$;

-- ---------------------------------------------------------------------
-- 6) Funções do BARBEIRO (exigem usuário logado que esteja em "admins")
-- ---------------------------------------------------------------------
create or replace function public.admin_list_appointments(p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  perform public._require_admin();
  return coalesce((
    select jsonb_agg(public._appt_json(a) order by a.day, a.start_time)
    from public.appointments a
    where (p_from is null or a.day >= p_from) and (p_to is null or a.day <= p_to)), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_status(p_id uuid, p_status text)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare a public.appointments;
begin
  perform public._require_admin();
  if p_status not in ('confirmed', 'completed', 'cancelled') then perform public._fail('invalid_status'); end if;
  begin
    update public.appointments set status = p_status where id = p_id returning * into a;
  exception when exclusion_violation then
    perform public._fail('slot_taken');
  end;
  if not found then perform public._fail('not_found'); end if;
  return public._appt_json(a);
end;
$$;

create or replace function public.admin_list_blocked()
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  perform public._require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id, 'dateStr', to_char(b.day, 'YYYY-MM-DD'),
      'timeStr', to_char(b.start_time, 'HH24:MI'), 'endTimeStr', to_char(b.end_time, 'HH24:MI'),
      'reason', b.reason) order by b.day, b.start_time)
    from public.blocked_slots b), '[]'::jsonb);
end;
$$;

create or replace function public.admin_add_block(p_day date, p_start time, p_end time, p_reason text)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare b public.blocked_slots;
begin
  perform public._require_admin();
  if p_start is null and p_end is not null then perform public._fail('invalid_range'); end if;
  if p_end is not null and p_end <= p_start then perform public._fail('invalid_range'); end if;
  insert into public.blocked_slots (day, start_time, end_time, reason)
  values (p_day, p_start, p_end, left(coalesce(p_reason, ''), 120))
  returning * into b;
  return jsonb_build_object('id', b.id);
end;
$$;

create or replace function public.admin_remove_block(p_id uuid)
returns void language plpgsql volatile security definer
set search_path = public, pg_temp as $$
begin
  perform public._require_admin();
  delete from public.blocked_slots where id = p_id;
end;
$$;

create or replace function public.admin_save_settings(p_settings jsonb)
returns void language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  ws time := (p_settings ->> 'workStart')::time;
  we time := (p_settings ->> 'workEnd')::time;
  iv int  := (p_settings ->> 'intervalMinutes')::int;
  off int[];
  ds  jsonb := coalesce(p_settings -> 'daySchedules', '{}'::jsonb);
  k   text;
begin
  perform public._require_admin();
  if ws is null or we is null or ws >= we then perform public._fail('invalid_hours'); end if;
  if iv is null or iv < 5 or iv > 240 then perform public._fail('invalid_interval'); end if;

  select coalesce(array_agg(x::int), '{}') into off
    from jsonb_array_elements_text(coalesce(p_settings -> 'fixedOffDays', '[]'::jsonb)) x;
  if exists (select 1 from unnest(off) d where d < 0 or d > 6) then perform public._fail('invalid_days'); end if;

  for k in select jsonb_object_keys(ds) loop
    if k !~ '^[0-6]$' or (ds -> k ->> 'start')::time >= (ds -> k ->> 'end')::time then
      perform public._fail('invalid_hours');
    end if;
  end loop;

  update public.barber_settings
     set work_start = ws, work_end = we, interval_minutes = iv,
         fixed_off_days = off, day_schedules = ds, updated_at = now()
   where id = 1;
end;
$$;

create or replace function public.admin_upsert_service(p_service jsonb)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  sid text := nullif(btrim(p_service ->> 'id'), '');
  v public.services;
begin
  perform public._require_admin();
  if sid is null then
    sid := 'svc-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    insert into public.services (id, name, description, price, duration_minutes, category, sort_order)
    values (sid, btrim(p_service ->> 'name'), nullif(btrim(p_service ->> 'description'), ''),
            (p_service ->> 'price')::numeric, (p_service ->> 'durationMinutes')::int,
            coalesce(p_service ->> 'category', 'outro'),
            coalesce((select max(sort_order) + 1 from public.services), 1))
    returning * into v;
  else
    update public.services
       set name = btrim(p_service ->> 'name'),
           description = nullif(btrim(p_service ->> 'description'), ''),
           price = (p_service ->> 'price')::numeric,
           duration_minutes = (p_service ->> 'durationMinutes')::int,
           category = coalesce(p_service ->> 'category', category)
     where id = sid returning * into v;
    if not found then perform public._fail('not_found'); end if;
  end if;
  return jsonb_build_object('id', v.id);
end;
$$;

create or replace function public.admin_delete_service(p_id text)
returns void language plpgsql volatile security definer
set search_path = public, pg_temp as $$
begin
  perform public._require_admin();
  if (select count(*) from public.services) <= 1 then perform public._fail('last_service'); end if;
  delete from public.services where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7) Permissões: só o necessário
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.get_public_data(),
  public.create_appointment(text, date, time, text, text),
  public.lookup_appointment(text, text),
  public.cancel_appointment(text, text),
  public.reschedule_appointment(text, text, date, time)
  to anon, authenticated;

grant execute on function
  public.is_admin(),
  public.admin_list_appointments(date, date),
  public.admin_set_status(uuid, text),
  public.admin_list_blocked(),
  public.admin_add_block(date, time, time, text),
  public.admin_remove_block(uuid),
  public.admin_save_settings(jsonb),
  public.admin_upsert_service(jsonb),
  public.admin_delete_service(text)
  to authenticated;

-- ---------------------------------------------------------------------
-- 8) Dados iniciais
-- ---------------------------------------------------------------------
insert into public.barber_settings (id) values (1) on conflict (id) do nothing;

insert into public.services (id, name, description, price, duration_minutes, category, sort_order) values
  ('corte',       'Corte Tradicional / Fade',      'Corte com visagismo básico, tesoura ou máquina com acabamento navalhado e alinhamento impecável.', 55, 45, 'cabelo',    1),
  ('barba',       'Barba Terapia & Alinhamento',   'Toalha quente com óleos essenciais, massagem facial e desenho sob medida com navalha afiada.',     45, 35, 'barba',     2),
  ('combo',       'Combo PURΛZI (Corte + Barba)',  'Nossa experiência completa: corte personalizado, barba terapia relaxante e finalização premium.', 90, 75, 'combo',     3),
  ('sobrancelha', 'Design de Sobrancelha',         'Limpeza e alinhamento na navalha ou pinça mantendo a naturalidade do olhar masculino.',            20, 15, 'outro',     4),
  ('visagismo',   'Consultoria de Visagismo',      'Análise de formato de rosto, linhas e proporções para definir o corte ideal para sua imagem pessoal.', 40, 30, 'visagismo', 5)
on conflict (id) do nothing;
