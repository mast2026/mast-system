begin;
create table if not exists public.mast_auth_members (
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 member_id integer not null unique references public.team_matching_members(id),
 created_at timestamptz not null default now()
);

create table if not exists public.mast_authorized_sessions (
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 member_id integer not null references public.team_matching_members(id),
 password_version text not null,
 admin_code_version timestamptz,
 created_at timestamptz not null default now()
);
alter table public.mast_authorized_sessions enable row level security;
revoke all on public.mast_authorized_sessions from public,anon,authenticated;
grant all on public.mast_authorized_sessions to service_role;

create table if not exists public.mast_auth_attempts (
 id bigint generated always as identity primary key,
 attempt_key text not null,
 attempted_at timestamptz not null default now()
);
create index if not exists mast_auth_attempts_key_time on public.mast_auth_attempts(attempt_key,attempted_at);
alter table public.mast_auth_members enable row level security;
alter table public.mast_auth_attempts enable row level security;
revoke all on public.mast_auth_members,public.mast_auth_attempts from public,anon,authenticated;
grant all on public.mast_auth_members,public.mast_auth_attempts to service_role;
grant usage,select on sequence public.mast_auth_attempts_id_seq to service_role;

create or replace function public.mast_check_auth_rate(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 if (select count(*) from public.mast_auth_attempts where attempt_key=p_key and attempted_at>now()-make_interval(secs=>p_seconds))>=p_limit then return false; end if;
 insert into public.mast_auth_attempts(attempt_key) values(p_key);
 delete from public.mast_auth_attempts where attempted_at<now()-interval '2 days';
 return true;
end $$;
revoke all on function public.mast_check_auth_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.mast_check_auth_rate(text,integer,integer) to service_role;

create or replace function public.mast_verify_member_password(p_name text,p_password text,p_member_id integer default null) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_member public.team_matching_members%rowtype; v_sha text; v_ok boolean;
begin
 if p_password is null or length(p_password)>128 or length(p_password)<4 then return null; end if;
 v_sha:=encode(extensions.digest(p_password,'sha256'),'hex');
 for v_member in select * from public.team_matching_members where roster_status='active' and lower(trim(name))=lower(trim(p_name)) and (p_member_id is null or id=p_member_id) order by id for update loop
  if v_member.password_hash is null then continue; end if;
  if v_member.password_hash like '$2%' then v_ok:=extensions.crypt(p_password,v_member.password_hash)=v_member.password_hash;
  else v_ok:=v_member.password_hash=v_sha or v_member.password_hash=p_password; end if;
  if v_ok then
   if v_member.password_hash not like '$2%' then
    update public.team_matching_members set password_hash=extensions.crypt(p_password,extensions.gen_salt('bf',12)),password_set_at=coalesce(password_set_at,now()) where id=v_member.id;
    update public.team_matching_member_passwords set password_hash=(select password_hash from public.team_matching_members where id=v_member.id) where member_id=v_member.id;
   end if;
   return (to_jsonb(v_member)-'password_hash'-'password_set_at')||jsonb_build_object('credential_version',(select password_hash from public.team_matching_members where id=v_member.id));
  end if;
 end loop;
 return null;
end $$;
revoke all on function public.mast_verify_member_password(text,text,integer) from public,anon,authenticated;
grant execute on function public.mast_verify_member_password(text,text,integer) to service_role;

create or replace function public.mast_current_member_id() returns integer
language sql stable security definer set search_path=public,auth,pg_temp as $$
 select m.id from public.mast_auth_members a join public.team_matching_members m on m.id=a.member_id
 join auth.sessions s on s.user_id=a.auth_user_id and s.id=(auth.jwt()->>'session_id')::uuid
 join public.mast_authorized_sessions z on z.session_id=s.id and z.auth_user_id=a.auth_user_id and z.member_id=m.id
 where a.auth_user_id=auth.uid() and m.roster_status in ('active','system')
 and z.password_version=coalesce(m.password_hash,'')
 and (z.admin_code_version is null or z.admin_code_version=(select updated_at from public.admin_auth where id=1))
 and (m.password_set_at is null or s.created_at>=m.password_set_at)
 limit 1;
$$;
create or replace function public.mast_current_legacy_id() returns uuid language sql stable security definer set search_path=public,pg_temp as $$
 select mast_member_id from public.team_matching_members where id=public.mast_current_member_id();
$$;
create or replace function public.mast_has_permission(p_section text default null) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select role in ('admin','manager','professor') or (p_section is not null and admin_sections ? p_section) from public.team_matching_members where id=public.mast_current_member_id()),false);
$$;
create or replace function public.mast_owns_team(p_team_id integer) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.team_matching_teams where id=p_team_id and leader_id=public.mast_current_member_id());
$$;
create or replace function public.mast_on_team(p_team_id integer) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.mast_owns_team(p_team_id) or exists(select 1 from public.team_matching_team_members where team_id=p_team_id and member_id=public.mast_current_member_id() and status='active');
$$;
revoke all on function public.mast_current_member_id(),public.mast_current_legacy_id(),public.mast_has_permission(text),public.mast_owns_team(integer),public.mast_on_team(integer) from public,anon;
grant execute on function public.mast_current_member_id(),public.mast_current_legacy_id(),public.mast_has_permission(text),public.mast_owns_team(integer),public.mast_on_team(integer) to authenticated,service_role;
create or replace function public.verify_admin_code(p_code text) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare a public.admin_auth%rowtype; m public.team_matching_members%rowtype;
begin
 select * into a from public.admin_auth where id=1 for share;
 if not found or extensions.crypt(p_code,a.code_hash) is distinct from a.code_hash then return null; end if;
 select * into m from public.team_matching_members where role in ('admin','manager','professor') and roster_status in ('active','system') order by role,id limit 1;
 return (to_jsonb(m)-'password_hash'-'password_set_at')||jsonb_build_object('credential_version',coalesce(m.password_hash,''),'code_version',a.updated_at);
end $$;
revoke all on function public.verify_admin_code(text) from public,anon,authenticated;
grant execute on function public.verify_admin_code(text) to service_role;
notify pgrst,'reload schema';
commit;
