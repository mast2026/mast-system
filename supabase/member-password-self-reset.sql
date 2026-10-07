begin;

create table if not exists public.team_matching_password_reset_attempts (
  id bigint generated always as identity primary key,
  attempt_key text not null,
  attempted_at timestamptz not null default now()
);
alter table public.team_matching_password_reset_attempts enable row level security;
revoke all on public.team_matching_password_reset_attempts from public, anon, authenticated;
grant all on public.team_matching_password_reset_attempts to service_role;
create index if not exists team_matching_password_reset_attempts_key_idx
  on public.team_matching_password_reset_attempts (attempt_key, attempted_at desc);

create or replace function public.request_member_password_reset(
  p_name text,
  p_school text,
  p_generation text,
  p_major text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_key text := lower(regexp_replace(coalesce(p_name, ''), '\\s', '', 'g'));
  v_school text := lower(regexp_replace(coalesce(p_school, ''), '\\s', '', 'g'));
  v_gen int := nullif(regexp_replace(coalesce(p_generation, ''), '[^0-9]', '', 'g'), '')::int;
  v_major text := lower(regexp_replace(coalesce(p_major, ''), '\\s', '', 'g'));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_member public.team_matching_members%rowtype;
  v_matches public.team_matching_members[];
  v_phones text[];
  v_db_major text := '';
  v_need_phone boolean;
  v_need_major boolean;
  v_phone_ok boolean;
  v_major_ok boolean;
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
   where lower(regexp_replace(m.name, '\\s', '', 'g')) = v_key;
  if v_matches is null then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '일치하는 회원이 없습니다.');
  end if;

  v_matches := array(
    select m from unnest(v_matches) as m
     where (v_gen is null or m.generation = v_gen)
       and (v_school = ''
            or lower(regexp_replace(coalesce(m.school, ''), '\\s', '', 'g')) = v_school
            or lower(regexp_replace(coalesce(m.school, ''), '\\s', '', 'g')) like v_school || '%'
            or v_school like lower(regexp_replace(coalesce(m.school, ''), '\\s', '', 'g')) || '%')
  );
  if coalesce(array_length(v_matches, 1), 0) = 0 then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '입력한 학교·기수와 일치하는 회원이 없습니다.');
  elsif array_length(v_matches, 1) > 1 then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '동명이인 계정이 여러 개입니다. 운영진에게 문의해 주세요.');
  end if;
  v_member := v_matches[1];
  v_db_major := lower(regexp_replace(coalesce(v_member.major, ''), '\\s', '', 'g'));

  select coalesce(array_agg(distinct regexp_replace(p, '[^0-9]', '', 'g')), '{}')
    into v_phones
    from (
      select v_member.phone as p
      union
      select a.phone from public.team_matching_applications a where a.applicant_id = v_member.id
    ) t
   where coalesce(p, '') <> '';
  v_phones := array(select x from unnest(v_phones) as x where x <> '');

  v_need_phone := coalesce(array_length(v_phones, 1), 0) > 0;
  v_need_major := v_db_major <> '';
  if not v_need_phone and not v_need_major then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '등록된 확인 정보가 없어 온라인 재설정이 어렵습니다. 운영진에게 문의해 주세요.');
  end if;

  v_phone_ok := v_need_phone and v_phone <> '' and v_phone = any(v_phones);
  v_major_ok := v_need_major and v_major <> '' and v_major = v_db_major;
  if (v_need_phone and not v_phone_ok) or (v_need_major and not v_major_ok) then
    insert into public.team_matching_password_reset_attempts (attempt_key) values (v_key);
    return jsonb_build_object('error', '입력한 정보가 회원 정보와 일치하지 않습니다. 등록된 전화번호와 전공을 정확히 입력해 주세요.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  delete from public.team_matching_password_resets where member_id = v_member.id;
  insert into public.team_matching_password_resets (token_hash, member_id, password_version, expires_at)
    values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_member.id, v_member.password_hash, v_expires);
  return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end;
$$;

revoke all on function public.request_member_password_reset(text, text, text, text, text) from public;
grant execute on function public.request_member_password_reset(text, text, text, text, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
