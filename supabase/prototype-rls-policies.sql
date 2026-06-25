-- MAST prototype RLS policies
-- Supabase SQL Editor에서 실행하세요.
--
-- 현재 프로토타입은 Supabase Auth 없이 team_matching_members 기준 name 로그인으로 동작합니다.
-- 그래서 anon 사용자가 MVP 기능을 테스트할 수 있도록 team_matching_* 테이블에 넓은 정책을 둡니다.
-- 실제 배포 전에는 반드시 Supabase Auth + 사용자별 RLS 정책으로 교체해야 합니다.

grant usage on schema public to anon, authenticated;

grant select, update on table public.team_matching_members to anon, authenticated;
grant select, insert, update on table public.team_matching_contests to anon, authenticated;
grant select, insert, update, delete on table public.team_matching_teams to anon, authenticated;
grant select, insert, update, delete on table public.team_matching_team_members to anon, authenticated;
grant select, insert, update, delete on table public.team_matching_applications to anon, authenticated;
grant select, insert, update on table public.team_matching_leader_applications to anon, authenticated;
grant select, insert, update on table public.team_matching_announcements to anon, authenticated;
grant select, insert, update on table public.team_matching_notifications to anon, authenticated;
grant select, update on table public.team_matching_peer_reviews to anon, authenticated;
grant select, insert, update on table public.team_matching_member_score_events to anon, authenticated;
grant select, insert, update on table public.team_matching_awards to anon, authenticated;
grant select on table public.promotion_member_progress_view to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

drop policy if exists "prototype_select_members" on public.team_matching_members;
create policy "prototype_select_members" on public.team_matching_members
for select to anon, authenticated
using (true);

drop policy if exists "prototype_update_members" on public.team_matching_members;
create policy "prototype_update_members" on public.team_matching_members
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_all_contests" on public.team_matching_contests;
create policy "prototype_all_contests" on public.team_matching_contests
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_all_teams" on public.team_matching_teams;
create policy "prototype_all_teams" on public.team_matching_teams
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_all_team_members" on public.team_matching_team_members;
create policy "prototype_all_team_members" on public.team_matching_team_members
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_all_applications" on public.team_matching_applications;
create policy "prototype_all_applications" on public.team_matching_applications
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_all_leader_applications" on public.team_matching_leader_applications;
create policy "prototype_all_leader_applications" on public.team_matching_leader_applications
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_select_announcements" on public.team_matching_announcements;
create policy "prototype_select_announcements" on public.team_matching_announcements
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_select_notifications" on public.team_matching_notifications;
create policy "prototype_select_notifications" on public.team_matching_notifications
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_select_peer_reviews" on public.team_matching_peer_reviews;
create policy "prototype_select_peer_reviews" on public.team_matching_peer_reviews
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_select_score_events" on public.team_matching_member_score_events;
create policy "prototype_select_score_events" on public.team_matching_member_score_events
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_select_awards" on public.team_matching_awards;
create policy "prototype_select_awards" on public.team_matching_awards
for all to anon, authenticated
using (true)
with check (true);
