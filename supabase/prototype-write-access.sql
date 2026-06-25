-- =====================================================================
-- MAST 프로토타입: 삭제/수정 권한 부여 (INSERT/UPDATE/DELETE)
-- Supabase SQL Editor에서 한 번 실행하세요.
--
-- 증상: 화면에서 "삭제" 버튼을 눌러도 에러는 없는데 실제로 지워지지 않음.
-- 원인: anon 키 기반이라 테이블 GRANT/RLS 에 DELETE(및 일부 UPDATE) 권한이 없어
--       Supabase가 조용히 0건 처리(삭제 안 됨)함.
-- 조치: 아래에서 프로토타입용으로 넓게 권한을 열어줍니다.
--
-- 주의: anon 전체 공개 정책이라 시연/MVP 전용입니다.
--       실제 배포 전에는 Supabase Auth + 사용자별 RLS 로 반드시 교체하세요.
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
declare
  t text;
  -- INSERT/UPDATE/DELETE 까지 모두 열어줄 테이블 목록
  write_tables text[] := array[
    'team_matching_members',
    'members',
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
    'team_matching_awards',
    'promotion_missions',
    'promotion_mission_assignments',
    'promotion_proofs',
    'activity_sessions',
    'activity_attendance_records'
  ];
begin
  foreach t in array write_tables loop
    -- 대상 테이블이 존재할 때만 처리 (없으면 건너뜀)
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- 1) 역할 권한(GRANT) : 조회 + 쓰기 + 삭제
    execute format('grant select, insert, update, delete on table public.%I to anon, authenticated', t);

    -- 2) RLS 활성화 + 전체 허용 정책 (select / insert / update / delete)
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists prototype_rw_select on public.%I', t);
    execute format('create policy prototype_rw_select on public.%I for select to anon, authenticated using (true)', t);

    execute format('drop policy if exists prototype_rw_insert on public.%I', t);
    execute format('create policy prototype_rw_insert on public.%I for insert to anon, authenticated with check (true)', t);

    execute format('drop policy if exists prototype_rw_update on public.%I', t);
    execute format('create policy prototype_rw_update on public.%I for update to anon, authenticated using (true) with check (true)', t);

    execute format('drop policy if exists prototype_rw_delete on public.%I', t);
    execute format('create policy prototype_rw_delete on public.%I for delete to anon, authenticated using (true)', t);
  end loop;
end $$;

-- 활동날씨/홍보/출석 조회용 View 권한 (있을 때만)
do $$
declare
  v text;
  views text[] := array[
    'promotion_member_progress_view',
    'promotion_assignment_status_view',
    'activity_attendance_summary_view'
  ];
begin
  foreach v in array views loop
    if to_regclass('public.' || v) is not null then
      execute format('grant select on public.%I to anon, authenticated', v);
    end if;
  end loop;
end $$;

-- 실행 후에도 삭제가 안 되면: 해당 테이블에 다른 제한적인 RLS 정책이 남아있는지,
-- 또는 외래키(FK) 제약 때문에 자식 레코드부터 지워야 하는지 확인하세요.
