-- MAST 프로토타입 전용: Supabase Auth 도입 전까지만 사용
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'team_matching_members',
    'team_matching_contests',
    'team_matching_teams',
    'team_matching_team_members',
    'team_matching_applications',
    'team_matching_leader_applications',
    'team_matching_announcements',
    'team_matching_notifications',
    'team_matching_notification_reads',
    'team_matching_member_score_events',
    'team_matching_peer_reviews',
    'team_matching_awards'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists prototype_select on public.%I', table_name);
    execute format(
      'create policy prototype_select on public.%I for select to anon, authenticated using (true)',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'team_matching_contests',
    'team_matching_teams',
    'team_matching_team_members',
    'team_matching_applications',
    'team_matching_leader_applications',
    'team_matching_announcements',
    'team_matching_notifications',
    'team_matching_notification_reads',
    'team_matching_member_score_events',
    'team_matching_peer_reviews',
    'team_matching_awards'
  ] loop
    execute format('drop policy if exists prototype_insert on public.%I', table_name);
    execute format(
      'create policy prototype_insert on public.%I for insert to anon, authenticated with check (true)',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'team_matching_members',
    'team_matching_contests',
    'team_matching_teams',
    'team_matching_team_members',
    'team_matching_applications',
    'team_matching_leader_applications',
    'team_matching_announcements',
    'team_matching_notification_reads',
    'team_matching_member_score_events',
    'team_matching_awards'
  ] loop
    execute format('drop policy if exists prototype_update on public.%I', table_name);
    execute format(
      'create policy prototype_update on public.%I for update to anon, authenticated using (true) with check (true)',
      table_name
    );
  end loop;

  -- 다단계 저장 실패 시 생성 직전 상태로 되돌리는 용도입니다.
  foreach table_name in array array[
    'team_matching_teams',
    'team_matching_team_members'
  ] loop
    execute format('drop policy if exists prototype_delete_rollback on public.%I', table_name);
    execute format(
      'create policy prototype_delete_rollback on public.%I for delete to anon, authenticated using (true)',
      table_name
    );
  end loop;
end
$$;

grant select on public.promotion_member_progress_view to anon, authenticated;
grant select on public.activity_attendance_summary_view to anon, authenticated;

create unique index if not exists team_matching_applications_team_applicant_uidx
on public.team_matching_applications (team_id, applicant_id);

create unique index if not exists team_matching_team_members_team_member_uidx
on public.team_matching_team_members (team_id, member_id);

notify pgrst, 'reload schema';
