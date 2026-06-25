-- MAST 팀매칭 프로토타입용 RLS 정책
-- Supabase SQL Editor에서 실행하세요.
-- 주의: anon key 기반 MVP/시연용으로 넓게 열어둔 정책입니다.
-- 실제 배포 전에는 Supabase Auth 또는 서버 API 기준으로 권한을 좁혀야 합니다.

-- 이 앱은 Supabase Auth를 사용하지 않으므로 RLS가 실제 로그인 회원을 식별할 수 없습니다.
-- 아래 정책은 로컬/프로토타입 검증용입니다. 운영 배포에는 그대로 사용하지 마세요.

alter table public.team_matching_members enable row level security;
alter table public.team_matching_contests enable row level security;
alter table public.team_matching_teams enable row level security;
alter table public.team_matching_team_members enable row level security;
alter table public.team_matching_applications enable row level security;
alter table public.team_matching_leader_applications enable row level security;
alter table public.team_matching_announcements enable row level security;
alter table public.team_matching_notifications enable row level security;
alter table public.team_matching_notification_reads enable row level security;
alter table public.team_matching_member_score_events enable row level security;
alter table public.team_matching_peer_reviews enable row level security;
alter table public.team_matching_awards enable row level security;

-- 활동날씨 조회 View는 테이블 RLS 정책이 아니라 View 조회 권한이 필요합니다.
-- 에타 홍보 진행률(40점)과 오프라인 출석률(30점)을 프론트에서 읽을 수 있게 합니다.
grant select on public.promotion_member_progress_view to anon, authenticated;
grant select on public.activity_attendance_summary_view to anon, authenticated;

-- 1) 관리자/회원 화면에서 필요한 조회 권한
drop policy if exists "read team matching members for prototype" on public.team_matching_members;
create policy "read team matching members for prototype"
on public.team_matching_members
for select
to anon, authenticated
using (true);

drop policy if exists "read all team matching contests for prototype" on public.team_matching_contests;
create policy "read all team matching contests for prototype"
on public.team_matching_contests
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching teams for prototype" on public.team_matching_teams;
create policy "read team matching teams for prototype"
on public.team_matching_teams
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching team members for prototype" on public.team_matching_team_members;
create policy "read team matching team members for prototype"
on public.team_matching_team_members
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching applications for prototype" on public.team_matching_applications;
create policy "read team matching applications for prototype"
on public.team_matching_applications
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching leader applications for prototype" on public.team_matching_leader_applications;
create policy "read team matching leader applications for prototype"
on public.team_matching_leader_applications
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching announcements for prototype" on public.team_matching_announcements;
create policy "read team matching announcements for prototype"
on public.team_matching_announcements
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching notifications for prototype" on public.team_matching_notifications;
create policy "read team matching notifications for prototype"
on public.team_matching_notifications
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching peer reviews for prototype" on public.team_matching_peer_reviews;
create policy "read team matching peer reviews for prototype"
on public.team_matching_peer_reviews
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching score events for prototype" on public.team_matching_member_score_events;
create policy "read team matching score events for prototype"
on public.team_matching_member_score_events
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching awards for prototype" on public.team_matching_awards;
create policy "read team matching awards for prototype"
on public.team_matching_awards
for select
to anon, authenticated
using (true);

drop policy if exists "read team matching notification reads for prototype" on public.team_matching_notification_reads;
create policy "read team matching notification reads for prototype"
on public.team_matching_notification_reads
for select
to anon, authenticated
using (true);

-- 2) 등록 기능에 필요한 insert 권한
drop policy if exists "insert team matching contests for prototype" on public.team_matching_contests;
create policy "insert team matching contests for prototype"
on public.team_matching_contests
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching teams for prototype" on public.team_matching_teams;
create policy "insert team matching teams for prototype"
on public.team_matching_teams
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching team members for prototype" on public.team_matching_team_members;
create policy "insert team matching team members for prototype"
on public.team_matching_team_members
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching applications for prototype" on public.team_matching_applications;
create policy "insert team matching applications for prototype"
on public.team_matching_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching leader applications for prototype" on public.team_matching_leader_applications;
create policy "insert team matching leader applications for prototype"
on public.team_matching_leader_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching announcements for prototype" on public.team_matching_announcements;
create policy "insert team matching announcements for prototype"
on public.team_matching_announcements
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching notifications for prototype" on public.team_matching_notifications;
create policy "insert team matching notifications for prototype"
on public.team_matching_notifications
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching peer reviews for prototype" on public.team_matching_peer_reviews;
create policy "insert team matching peer reviews for prototype"
on public.team_matching_peer_reviews
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching score events for prototype" on public.team_matching_member_score_events;
create policy "insert team matching score events for prototype"
on public.team_matching_member_score_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching awards for prototype" on public.team_matching_awards;
create policy "insert team matching awards for prototype"
on public.team_matching_awards
for insert
to anon, authenticated
with check (true);

drop policy if exists "insert team matching notification reads for prototype" on public.team_matching_notification_reads;
create policy "insert team matching notification reads for prototype"
on public.team_matching_notification_reads
for insert
to anon, authenticated
with check (true);

-- 3) 승인/수정/상태변경 기능에 필요한 update 권한
drop policy if exists "update team matching contests for prototype" on public.team_matching_contests;
create policy "update team matching contests for prototype"
on public.team_matching_contests
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching teams for prototype" on public.team_matching_teams;
create policy "update team matching teams for prototype"
on public.team_matching_teams
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching team members for prototype" on public.team_matching_team_members;
create policy "update team matching team members for prototype"
on public.team_matching_team_members
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching applications for prototype" on public.team_matching_applications;
create policy "update team matching applications for prototype"
on public.team_matching_applications
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching leader applications for prototype" on public.team_matching_leader_applications;
create policy "update team matching leader applications for prototype"
on public.team_matching_leader_applications
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching members for prototype" on public.team_matching_members;
create policy "update team matching members for prototype"
on public.team_matching_members
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching announcements for prototype" on public.team_matching_announcements;
create policy "update team matching announcements for prototype"
on public.team_matching_announcements
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching peer reviews for prototype" on public.team_matching_peer_reviews;
create policy "update team matching peer reviews for prototype"
on public.team_matching_peer_reviews
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching awards for prototype" on public.team_matching_awards;
create policy "update team matching awards for prototype"
on public.team_matching_awards
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "update team matching notification reads for prototype" on public.team_matching_notification_reads;
create policy "update team matching notification reads for prototype"
on public.team_matching_notification_reads
for update
to anon, authenticated
using (true)
with check (true);

-- 팀 생성/지원자 승인 도중 후속 저장 실패 시 롤백에 필요한 delete 권한
drop policy if exists "delete team matching teams for prototype rollback" on public.team_matching_teams;
create policy "delete team matching teams for prototype rollback"
on public.team_matching_teams
for delete
to anon, authenticated
using (true);

drop policy if exists "delete team matching team members for prototype rollback" on public.team_matching_team_members;
create policy "delete team matching team members for prototype rollback"
on public.team_matching_team_members
for delete
to anon, authenticated
using (true);

-- PostgREST 스키마 캐시 갱신
create unique index if not exists team_matching_applications_team_applicant_uidx
on public.team_matching_applications (team_id, applicant_id);

create unique index if not exists team_matching_team_members_team_member_uidx
on public.team_matching_team_members (team_id, member_id);

notify pgrst, 'reload schema';
