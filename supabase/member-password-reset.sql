begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.team_matching_password_resets (
  token_hash text primary key,
  member_id bigint not null references public.team_matching_members(id) on delete cascade,
  password_version text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.team_matching_password_resets enable row level security;
revoke all on public.team_matching_password_resets from public, anon, authenticated;
grant all on public.team_matching_password_resets to service_role;

create or replace function public.issue_member_password_reset(p_member_id bigint, p_admin_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
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
  select * into v_member from public.team_matching_members where id = p_member_id for update;
  if not found then
    raise exception '회원을 찾을 수 없습니다.';
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  delete from public.team_matching_password_resets where member_id = p_member_id;
  insert into public.team_matching_password_resets (token_hash, member_id, password_version, expires_at)
    values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_member_id, v_member.password_hash, v_expires);
  return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end;
$$;

create or replace function public.complete_member_password_reset(p_token text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
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
    where r.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    for update of m;
  select * into v_reset from public.team_matching_password_resets
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or v_reset.used_at is not null or v_reset.expires_at <= clock_timestamp()
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
$$;

revoke all on function public.issue_member_password_reset(bigint, text) from public;
revoke all on function public.complete_member_password_reset(text, text) from public;
grant execute on function public.issue_member_password_reset(bigint, text) to anon, authenticated, service_role;
grant execute on function public.complete_member_password_reset(text, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
