-- MAST name-based login prototype access
-- Supabase SQL Editor에서 실행하세요.
-- 주의: Supabase Auth를 사용하지 않는 현재 구조는 anon 사용자를 회원별로 구분할 수 없습니다.
-- 운영 배포 전에는 반드시 Supabase Auth + 회원별 RLS 정책으로 교체해야 합니다.

grant usage on schema public to anon, authenticated;

grant select, update on table public.team_matching_members to anon, authenticated;
grant select, insert, update on table public.team_matching_contests to anon, authenticated;
grant select, insert, update, delete on table public.team_matching_teams to anon, authenticated;
grant select, insert, update, delete on table public.team_matching_team_members to anon, authenticated;
grant select, insert, update on table public.team_matching_applications to anon, authenticated;
grant select, insert, update on table public.team_matching_leader_applications to anon, authenticated;

grant select on table public.team_matching_announcements to anon, authenticated;
grant select on table public.team_matching_notifications to anon, authenticated;
grant select on table public.team_matching_peer_reviews to anon, authenticated;
grant select on table public.team_matching_member_score_events to anon, authenticated;
grant select on table public.team_matching_awards to anon, authenticated;
grant select on table public.promotion_member_progress_view to anon, authenticated;

-- identity 컬럼 insert에 필요한 sequence 권한
grant usage, select on all sequences in schema public to anon, authenticated;

-- 이 파일 실행 후에도 빈 배열만 반환된다면 해당 테이블의 RLS 정책 확인이 필요합니다.
