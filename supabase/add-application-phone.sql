-- =====================================================================
-- 팀 지원서에 전화번호 + 공개 동의 컬럼 추가
-- 지원 시 본인 전화번호와 공개 동의를 함께 제출하고,
-- 합류(승인)되면 그 팀의 팀장만 전화번호를 볼 수 있습니다.
-- Supabase SQL Editor에서 한 번 실행하세요.
-- =====================================================================
alter table public.team_matching_applications
  add column if not exists phone text;
alter table public.team_matching_applications
  add column if not exists phone_consent boolean default false;
