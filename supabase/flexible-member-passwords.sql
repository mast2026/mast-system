begin;

create or replace function public.mast_hash_password(p_password text) returns text
language sql volatile set search_path=public,extensions,pg_temp as $$
 select 'v2$'||extensions.crypt(encode(extensions.digest(p_password,'sha256'),'hex'),extensions.gen_salt('bf',12));
$$;
create or replace function public.mast_password_matches(p_password text,p_hash text) returns boolean
language sql immutable set search_path=public,extensions,pg_temp as $$
 select case when p_password is null or p_hash is null then false
 when p_hash like 'v2$%' then 'v2$'||extensions.crypt(encode(extensions.digest(p_password,'sha256'),'hex'),substring(p_hash from 4))=p_hash
 when p_hash like '$2%' then extensions.crypt(p_password,p_hash)=p_hash
 else p_hash=encode(extensions.digest(p_password,'sha256'),'hex') or p_hash=p_password end;
$$;
revoke all on function public.mast_hash_password(text),public.mast_password_matches(text,text) from public,anon,authenticated;
grant execute on function public.mast_hash_password(text),public.mast_password_matches(text,text) to service_role;


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
  if p_password is null or length(p_password) = 0 then
    raise exception '비밀번호를 입력해 주세요.';
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
  v_next_hash := public.mast_hash_password(p_password);
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

CREATE OR REPLACE FUNCTION public.mast_initialize_password(p_name text, p_school text, p_generation text, p_phone text, p_password text, p_member_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare m public.team_matching_members%rowtype;
begin
 if p_password is null or length(p_password)=0 then return jsonb_build_object('error','비밀번호를 입력해 주세요.'); end if;
 select * into m from public.team_matching_members where id=p_member_id and roster_status='active' and lower(trim(name))=lower(trim(p_name)) and lower(regexp_replace(school,'\s','','g'))=lower(regexp_replace(coalesce(p_school,''),'\s','','g')) and generation::text=regexp_replace(coalesce(p_generation,''),'[^0-9]','','g') and regexp_replace(coalesce(phone,''),'[^0-9]','','g')=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') and regexp_replace(coalesce(p_phone,''),'[^0-9]','','g')~'^010[0-9]{8}$' for update;
 if not found then return jsonb_build_object('error','가입할 때 적은 학교·기수·전화번호를 확인해 주세요.'); end if;
 if coalesce(m.password_hash,'')<>'' then return jsonb_build_object('error','이미 비밀번호가 설정된 계정입니다.'); end if;
 update public.team_matching_members set password_hash=public.mast_hash_password(p_password),password_set_at=now() where id=m.id;
 return (to_jsonb(m)-'password_hash'-'password_set_at')||jsonb_build_object('credential_version',(select password_hash from public.team_matching_members where id=m.id));
end $function$
;

CREATE OR REPLACE FUNCTION public.mast_verify_member_password(p_name text, p_password text, p_member_id integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare v_member public.team_matching_members%rowtype; v_sha text; v_ok boolean;
begin
 if p_password is null or length(p_password)=0 then return null; end if;
 v_sha:=encode(extensions.digest(p_password,'sha256'),'hex');
 for v_member in select * from public.team_matching_members where roster_status='active' and lower(trim(name))=lower(trim(p_name)) and (p_member_id is null or id=p_member_id) order by id for update loop
  if v_member.password_hash is null then continue; end if;
  v_ok:=public.mast_password_matches(p_password,v_member.password_hash);
  if v_ok then
   if v_member.password_hash not like '$2%' and v_member.password_hash not like 'v2$%' then
    update public.team_matching_members set password_hash=public.mast_hash_password(p_password),password_set_at=coalesce(password_set_at,now()) where id=v_member.id;
    update public.team_matching_member_passwords set password_hash=(select password_hash from public.team_matching_members where id=v_member.id) where member_id=v_member.id;
   end if;
   return (to_jsonb(v_member)-'password_hash'-'password_set_at')||jsonb_build_object('credential_version',(select password_hash from public.team_matching_members where id=v_member.id));
  end if;
 end loop;
 return null;
end $function$
;

do $$ declare p text; h text; begin
 foreach p in array array['1','1234','abc','한글','!',' ',repeat('긴비밀번호',100)] loop
  h:=public.mast_hash_password(p);
  if not public.mast_password_matches(p,h) or public.mast_password_matches(p||'x',h) then raise exception 'password roundtrip failed'; end if;
 end loop;
 if public.mast_password_matches(repeat('a',72)||'B',public.mast_hash_password(repeat('a',72)||'A')) then raise exception 'long password collision'; end if;
 if not public.mast_password_matches('old1234',extensions.crypt('old1234',extensions.gen_salt('bf',4))) then raise exception 'legacy bcrypt mismatch'; end if;
end $$;
notify pgrst,'reload schema';
commit;
