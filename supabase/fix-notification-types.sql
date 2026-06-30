-- =====================================================================
-- 알림 type 체크 제약 교체
-- 증상: "대상자에게 알림 보내기" 등에서
--   new row for relation "team_matching_notifications" violates
--   check constraint "team_matching_notifications_type_check"
-- 원인: type 컬럼 체크 제약이 앱이 쓰는 일부 타입(promotion_target, attendance 등)을 막음
-- 조치: 앱이 사용하는 알림 타입을 모두 허용하도록 제약 재생성
-- Supabase SQL Editor에서 한 번 실행하세요.
-- =====================================================================
alter table public.team_matching_notifications
  drop constraint if exists team_matching_notifications_type_check;

alter table public.team_matching_notifications
  add constraint team_matching_notifications_type_check
  check (type in (
    'notice','announcement','attendance','attendance_open',
    'promotion_target','promotion',
    'application_result','application_pending',
    'leader_application_result',
    'team','team_member','team_leave_requested','team_member_left','team_member_removed',
    'system','general'
  ));
