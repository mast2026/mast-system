begin;
do $$
declare
  v_member record;
  v_result jsonb;
  v_name text;
begin
  select * into v_member from public.team_matching_members where role = 'member' order by id limit 1 for update;
  assert found, 'member fixture required';
  v_name := v_member.name;
  update public.team_matching_members set phone = '010-1234-5678', major = '컴퓨터공학과' where id = v_member.id;

  v_result := public.request_member_password_reset(v_name, v_member.school, v_member.generation::text, '컴퓨터공학과', '010-9999-9999');
  assert v_result ? 'error', 'wrong phone must fail';

  v_result := public.request_member_password_reset(v_name, '없는대학교', '9', '컴퓨터공학과', '01012345678');
  assert v_result ? 'error', 'wrong school/generation must fail';

  v_result := public.request_member_password_reset(v_name, v_member.school, v_member.generation::text, '컴퓨터공학과', '010-1234-5678');
  assert length(v_result->>'token') = 64, 'verified member gets a token';
  assert exists (select 1 from public.team_matching_password_resets where member_id = v_member.id), 'reset row stored';

  v_result := public.request_member_password_reset('없는이름_xyz', '학교', '1', '', '');
  assert v_result ? 'error', 'unknown name must fail';
  assert exists (select 1 from public.team_matching_password_reset_attempts where attempt_key = lower(regexp_replace('없는이름_xyz', '\\s', '', 'g'))), 'failed attempts are recorded for rate limiting';

  update public.team_matching_members set phone = null, major = null where id = v_member.id;
  delete from public.team_matching_applications where applicant_id = v_member.id;
  v_result := public.request_member_password_reset(v_name, v_member.school, v_member.generation::text, '', '');
  assert v_result->>'error' like '%운영진%', 'member without verifiable info must be told to contact admins';
end;
$$;
rollback;

