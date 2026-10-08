begin;
do $$
declare
  v_member_id bigint;
  v_original_hash text;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash text;
  v_failed boolean;
  v_result jsonb;
  v_admin_code text := encode(extensions.gen_random_bytes(32), 'hex');
  v_first_link jsonb;
  v_second_link jsonb;
begin
  select id, password_hash into v_member_id, v_original_hash
    from public.team_matching_members where role = 'member' and roster_status = 'active' order by id limit 1 for update;
  assert v_member_id is not null, 'A member fixture is required';
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  v_failed := false;
  begin
    perform public.issue_member_password_reset(v_member_id, encode(extensions.gen_random_bytes(32), 'hex'));
  exception when insufficient_privilege then v_failed := true;
  end;
  assert v_failed, 'Invalid admin codes must not issue links';

  update public.admin_auth set code_hash = extensions.crypt(v_admin_code, extensions.gen_salt('bf')) where id = 1;
  assert found, 'The admin authentication fixture is required';
  v_first_link := public.issue_member_password_reset(v_member_id, v_admin_code);
  assert length(v_first_link->>'token') = 64, 'Authorized admins must receive a random token';
  assert (select password_hash is not distinct from v_original_hash from public.team_matching_members where id = v_member_id), 'Issuance must preserve the current password';
  v_second_link := public.issue_member_password_reset(v_member_id, v_admin_code);
  assert v_first_link->>'token' <> v_second_link->>'token', 'Reissued tokens must differ';
  assert not exists (select 1 from public.team_matching_password_resets where token_hash = encode(extensions.digest(v_first_link->>'token', 'sha256'), 'hex')), 'Reissuance must invalidate the old token';
  assert (v_second_link->>'expires_at')::timestamptz between clock_timestamp() + interval '29 minutes' and clock_timestamp() + interval '31 minutes', 'Links must expire in 30 minutes';

  insert into public.team_matching_password_resets (token_hash, member_id, password_version, expires_at)
    values (v_token_hash, v_member_id, v_original_hash, clock_timestamp() - interval '1 minute');
  v_failed := false;
  begin
    perform public.complete_member_password_reset(v_token, 'ResetTest123');
  exception when raise_exception then v_failed := true;
  end;
  assert v_failed, 'Expired links must fail';
  assert (select password_hash is not distinct from v_original_hash from public.team_matching_members where id = v_member_id), 'Failed requests must not change passwords';

  update public.team_matching_password_resets set expires_at = clock_timestamp() + interval '30 minutes' where token_hash = v_token_hash;
  v_failed := false;
  begin
    perform public.complete_member_password_reset(v_token, '12345678');
  exception when raise_exception then v_failed := true;
  end;
  assert v_failed, 'Weak passwords must fail';
  assert (select used_at is null from public.team_matching_password_resets where token_hash = v_token_hash), 'Rejected passwords must not consume links';

  v_result := public.complete_member_password_reset(v_token, 'ResetTest123');
  assert v_result->>'ok' = 'true', 'Valid links must succeed';
  assert (select password_hash = encode(extensions.digest('ResetTest123', 'sha256'), 'hex') from public.team_matching_members where id = v_member_id), 'New passwords must match the existing login format';
  assert not exists (select 1 from public.team_matching_member_passwords where member_id = v_member_id and password_hash <> encode(extensions.digest('ResetTest123', 'sha256'), 'hex')), 'Legacy passwords must match';
  v_failed := false;
  begin
    perform public.complete_member_password_reset(v_token, 'OtherTest123');
  exception when raise_exception then v_failed := true;
  end;
  assert v_failed, 'Used links must fail';

  update public.team_matching_password_resets set used_at = null where token_hash = v_token_hash;
  v_failed := false;
  begin
    perform public.complete_member_password_reset(v_token, 'OtherTest123');
  exception when raise_exception then v_failed := true;
  end;
  assert v_failed, 'Links issued before another password change must fail';
  assert not has_table_privilege('anon', 'public.team_matching_password_resets', 'select'), 'Tokens must be private';
  assert not has_table_privilege('anon', 'public.team_matching_password_resets', 'insert'), 'Anonymous clients must not issue tokens directly';
end;
$$;
rollback;
