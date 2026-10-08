begin;
alter table public.team_matching_members add column if not exists roster_status text not null default 'active';
alter table public.team_matching_members add column if not exists roster_number integer;
alter table public.team_matching_members add column if not exists instagram_handle text;
alter table public.team_matching_members add column if not exists roster_notes text;
alter table public.team_matching_members add column if not exists is_officer boolean not null default false;
alter table public.members add column if not exists phone text;
alter table public.members add column if not exists instagram_handle text;
alter table public.members add column if not exists roster_number integer;
alter table public.members add column if not exists position_title text;
alter table public.members add column if not exists roster_notes text;
alter table public.members add column if not exists is_officer boolean not null default false;

-- Original IDs remain as inactive records because attendance and team history reference them.
create table if not exists public.mast_member_archive (
 source_table text not null,
 source_id text not null,
 import_batch text not null,
 reason text not null,
 original_record jsonb not null,
 archived_at timestamptz not null default now(),
 primary key (source_table,source_id,import_batch)
);
create table if not exists public.mast_roster_imports (
 import_batch text primary key,
 source_files jsonb not null,
 source_records jsonb not null,
 imported_at timestamptz not null default now()
);
alter table public.mast_roster_imports add column if not exists source_statistics jsonb;
alter table public.mast_member_archive enable row level security;
alter table public.mast_roster_imports enable row level security;
revoke all on public.mast_member_archive,public.mast_roster_imports from public,anon,authenticated;
grant all on public.mast_member_archive,public.mast_roster_imports to service_role;

-- Restrictive policies also apply when an older permissive prototype policy exists.
drop policy if exists roster_visible on public.team_matching_members;
create policy roster_visible on public.team_matching_members as restrictive for select to anon,authenticated using (roster_status in ('active','system'));
drop policy if exists roster_update on public.team_matching_members;
create policy roster_update on public.team_matching_members as restrictive for update to anon,authenticated using (roster_status='active') with check (roster_status='active');
drop policy if exists roster_delete on public.team_matching_members;
create policy roster_delete on public.team_matching_members as restrictive for delete to anon,authenticated using (roster_status='active');
drop policy if exists roster_visible on public.members;
create policy roster_visible on public.members as restrictive for select to anon,authenticated using (status='active');
drop policy if exists roster_update on public.members;
create policy roster_update on public.members as restrictive for update to anon,authenticated using (status='active') with check (status='active');

CREATE OR REPLACE FUNCTION public.complete_member_password_reset(p_token text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_reset public.team_matching_password_resets%rowtype;
  v_current_hash text;
  v_next_hash text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception '재설정 링크가 유효하지 않습니다. 운영진에게 새 링크를 요청해 주세요.';
  end if;
  if p_password is null or length(p_password) < 8 or length(p_password) > 128
      or p_password !~ '[A-Za-z]' or p_password !~ '[0-9]' then
    raise exception '비밀번호는 영문과 숫자를 포함해 8~128자로 입력해 주세요.';
  end if;
  -- Lock the member first, matching issuance lock order to avoid deadlocks.
  select m.password_hash into v_current_hash
    from public.team_matching_members m
    join public.team_matching_password_resets r on r.member_id = m.id
    where m.roster_status = 'active' and r.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    for update of m;
  select * into v_reset from public.team_matching_password_resets
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or not exists (select 1 from public.team_matching_members where id=v_reset.member_id and roster_status='active') or v_reset.used_at is not null or v_reset.expires_at <= clock_timestamp()
      or v_reset.password_version is distinct from v_current_hash then
    raise exception '재설정 링크가 만료되었거나 이미 사용되었습니다. 운영진에게 새 링크를 요청해 주세요.';
  end if;
  v_next_hash := encode(extensions.digest(p_password, 'sha256'), 'hex');
  update public.team_matching_members
    set password_hash = v_next_hash, password_set_at = clock_timestamp()
    where id = v_reset.member_id;
  if to_regclass('public.team_matching_member_passwords') is not null then
    execute 'update public.team_matching_member_passwords set password_hash = $1 where member_id = $2'
      using v_next_hash, v_reset.member_id;
  end if;
  update public.team_matching_password_resets set used_at = clock_timestamp()
    where token_hash = v_reset.token_hash;
  return jsonb_build_object('ok', true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.issue_member_password_reset(p_member_id bigint, p_admin_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_admin jsonb;
  v_member public.team_matching_members%rowtype;
  v_token text;
  v_expires timestamptz := clock_timestamp() + interval '30 minutes';
begin
  v_admin := public.verify_admin_code(p_admin_code);
  if v_admin is null or not coalesce(v_admin->>'role' in ('admin', 'manager', 'professor'), false) then
    raise exception '관리자 코드가 일치하지 않습니다.' using errcode = '42501';
  end if;
  select * into v_member from public.team_matching_members where id = p_member_id and roster_status = 'active' for update;
  if not found then
    raise exception '회원을 찾을 수 없습니다.';
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  delete from public.team_matching_password_resets where member_id = p_member_id;
  insert into public.team_matching_password_resets (token_hash, member_id, password_version, expires_at)
    values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_member_id, v_member.password_hash, v_expires);
  return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.request_member_password_reset(p_name text, p_school text, p_generation text, p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_key text := lower(regexp_replace(coalesce(p_name, ''), '\s', '', 'g'));
  v_school text := lower(regexp_replace(coalesce(p_school, ''), '\s', '', 'g'));
  v_gen int := nullif(regexp_replace(coalesce(p_generation, ''), '[^0-9]', '', 'g'), '')::int;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_member public.team_matching_members%rowtype;
  v_matches public.team_matching_members[];
  v_phones text[];
  v_token text;
  v_expires timestamptz := clock_timestamp() + interval '30 minutes';
begin
  if v_key = '' then
    return jsonb_build_object('error', '이름을 입력해 주세요.');
  end if;
  if (select count(*) from public.team_matching_password_reset_attempts
        where attempt_key = v_key and attempted_at > clock_timestamp() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', '시도 횟수가 너무 많습니다. 1시간 후 다시 시도하거나 운영진에게 문의해 주세요.');
  end if;

  select array_agg(m) into v_matches
    from public.team_matching_members m
   where m.roster_status = 'active' and lower(regexp_replace(m.name, '\s', '', 'g')) = v_key;
  if v_matches is null then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '일치하는 회원이 없습니다.');
  end if;

  v_matches := array(
    select m from unnest(v_matches) as m
     where (v_gen is null or m.generation = v_gen)
       and (v_school = ''
            or lower(regexp_replace(coalesce(m.school, ''), '\s', '', 'g')) = v_school
            or lower(regexp_replace(coalesce(m.school, ''), '\s', '', 'g')) like v_school || '%'
            or v_school like lower(regexp_replace(coalesce(m.school, ''), '\s', '', 'g')) || '%')
  );
  if coalesce(array_length(v_matches, 1), 0) = 0 then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '입력한 학교·기수와 일치하는 회원이 없습니다.');
  elsif array_length(v_matches, 1) > 1 then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '동명이인 계정이 여러 개입니다. 운영진에게 문의해 주세요.');
  end if;
  v_member := v_matches[1];

  select coalesce(array_agg(distinct regexp_replace(p, '[^0-9]', '', 'g')), '{}')
    into v_phones
    from (
      select v_member.phone as p
      union
      select a.phone from public.team_matching_applications a where a.applicant_id = v_member.id
    ) t
   where coalesce(p, '') <> '';
  v_phones := array(select x from unnest(v_phones) as x where x <> '');

  if coalesce(array_length(v_phones, 1), 0) = 0 then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '등록된 전화번호가 없어 온라인 재설정이 어렵습니다. 운영진에게 문의해 주세요.');
  end if;

  if v_phone = '' or not (v_phone = any(v_phones)) then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '전화번호가 회원 정보와 일치하지 않습니다. 가입할 때 적은 번호를 정확히 입력해 주세요.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  delete from public.team_matching_password_resets where member_id = v_member.id;
  insert into public.team_matching_password_resets (token_hash, member_id, password_version, expires_at)
    values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_member.id, v_member.password_hash, v_expires);
  return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end;
$function$
;
notify pgrst,'reload schema';
commit;
