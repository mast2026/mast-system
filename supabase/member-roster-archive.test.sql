begin;
do $$
declare
 v_member public.team_matching_members%rowtype;
 v_result jsonb;
 v_token text := encode(extensions.gen_random_bytes(32),'hex');
 v_failed boolean := false;
begin
 select * into v_member from public.team_matching_members where roster_status='active' and role='member' order by id limit 1 for update;
 assert found,'active fixture required';
 update public.team_matching_members set roster_status='archived' where id=v_member.id;
 v_result := public.request_member_password_reset(v_member.name,v_member.school,v_member.generation::text,v_member.phone);
 assert v_result ? 'error' and not (v_result ? 'token'),'excluded members cannot request reset tokens';
 insert into public.team_matching_password_resets(token_hash,member_id,password_version,expires_at)
 values(encode(extensions.digest(v_token,'sha256'),'hex'),v_member.id,v_member.password_hash,now()+interval '30 minutes');
 begin
  perform public.complete_member_password_reset(v_token,'ArchiveTest123');
 exception when raise_exception then v_failed:=true;
 end;
 assert v_failed,'tokens cannot reset excluded members';
 assert (select password_hash is not distinct from v_member.password_hash from public.team_matching_members where id=v_member.id),'excluded password remains unchanged';
 assert not has_table_privilege('anon','public.mast_member_archive','select'),'archive is private';
 assert not has_table_privilege('authenticated','public.mast_member_archive','select'),'archive is private for ordinary authenticated users';
end $$;
set local role anon;
do $$ begin
 assert (select count(*) from public.team_matching_members where roster_status='archived')=0,'excluded members must not be readable through REST';
 assert (select count(*) from public.members where status<>'active')=0,'inactive promotion members must not be visible';
end $$;
rollback;
