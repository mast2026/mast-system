begin;


-- Remove every old prototype policy and stale table/column privilege.
do $$ declare r record; p record; cols text; begin
 for r in select c.relname,c.relkind from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','v','p') loop
  execute format('revoke all on public.%I from public,anon,authenticated',r.relname);
  select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid=format('public.%I',r.relname)::regclass and attnum>0 and not attisdropped;
  execute format('revoke select (%s),insert (%s),update (%s),references (%s) on public.%I from public,anon,authenticated',cols,cols,cols,cols,r.relname);
  if r.relkind in ('r','p') then
   execute format('alter table public.%I enable row level security',r.relname);
   for p in select policyname from pg_policies where schemaname='public' and tablename=r.relname loop execute format('drop policy %I on public.%I',p.policyname,r.relname); end loop;
  else execute format('alter view public.%I set (security_invoker=true)',r.relname); end if;
 end loop;
end $$;
revoke all on all sequences in schema public from public,anon;
grant usage,select on all sequences in schema public to authenticated;
alter default privileges for role postgres in schema public revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public,anon,authenticated;


grant select (id,mast_member_id,name,school,major,generation,role,is_leader,created_at,updated_at,position_title,admin_sections,roster_status,roster_number,instagram_handle,roster_notes,is_officer) on public.team_matching_members to authenticated;

grant insert,update,delete on public.team_matching_members to authenticated;

create policy mast_select on public.team_matching_members for SELECT to authenticated using (public.mast_current_member_id() is not null and (roster_status='active' or id=public.mast_current_member_id())) ;

create policy mast_insert on public.team_matching_members for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.team_matching_members for DELETE to authenticated using (public.mast_has_permission('members')) ;

create policy mast_update on public.team_matching_members for UPDATE to authenticated using (public.mast_has_permission('members') or public.mast_has_permission('contest')) with check (public.mast_has_permission('members') or public.mast_has_permission('contest')) ;

revoke insert (password_hash,password_set_at),update (password_hash,password_set_at) on public.team_matching_members from authenticated;

revoke insert,update on public.team_matching_members from authenticated;

grant insert (id,mast_member_id,name,school,major,generation,role,is_leader,created_at,updated_at,position_title,admin_sections,roster_status,roster_number,instagram_handle,roster_notes,is_officer),update (id,mast_member_id,name,school,major,generation,role,is_leader,created_at,updated_at,position_title,admin_sections,roster_status,roster_number,instagram_handle,roster_notes,is_officer) on public.team_matching_members to authenticated;

grant select (id,name,gi,school,major,role,status,created_at,updated_at,instagram_handle,roster_number,position_title,roster_notes,is_officer) on public.members to authenticated;

grant insert,update,delete on public.members to authenticated;

create policy mast_select on public.members for SELECT to authenticated using (public.mast_current_member_id() is not null and status='active') ;

create policy mast_insert on public.members for INSERT to authenticated with check ((public.mast_has_permission('members') or public.mast_has_permission('promotion'))) ;

create policy mast_update on public.members for UPDATE to authenticated using ((public.mast_has_permission('members') or public.mast_has_permission('promotion'))) with check ((public.mast_has_permission('members') or public.mast_has_permission('promotion'))) ;

create policy mast_delete on public.members for DELETE to authenticated using ((public.mast_has_permission('members') or public.mast_has_permission('promotion'))) ;

revoke insert,update on public.members from authenticated;

grant insert (id,name,gi,school,major,role,status,created_at,updated_at,instagram_handle,roster_number,position_title,roster_notes,is_officer),update (id,name,gi,school,major,role,status,created_at,updated_at,instagram_handle,roster_number,position_title,roster_notes,is_officer) on public.members to authenticated;

grant select on public.settings to authenticated;

grant insert,update,delete on public.settings to authenticated;

create policy mast_select on public.settings for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.settings for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_update on public.settings for UPDATE to authenticated using (public.mast_has_permission('members')) with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.settings for DELETE to authenticated using (public.mast_has_permission('members')) ;

grant select on public.team_matching_contests to authenticated;

grant insert,update,delete on public.team_matching_contests to authenticated;

create policy mast_select on public.team_matching_contests for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.team_matching_contests for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.team_matching_contests for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.team_matching_contests for DELETE to authenticated using (public.mast_has_permission('contest')) ;

grant select on public.team_matching_announcements to authenticated;

grant insert,update,delete on public.team_matching_announcements to authenticated;

create policy mast_select on public.team_matching_announcements for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.team_matching_announcements for INSERT to authenticated with check (public.mast_has_permission('notice')) ;

create policy mast_update on public.team_matching_announcements for UPDATE to authenticated using (public.mast_has_permission('notice')) with check (public.mast_has_permission('notice')) ;

create policy mast_delete on public.team_matching_announcements for DELETE to authenticated using (public.mast_has_permission('notice')) ;

grant select on public.promotion_missions to authenticated;

grant insert,update,delete on public.promotion_missions to authenticated;

create policy mast_select on public.promotion_missions for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.promotion_missions for INSERT to authenticated with check (public.mast_has_permission('promotion')) ;

create policy mast_update on public.promotion_missions for UPDATE to authenticated using (public.mast_has_permission('promotion')) with check (public.mast_has_permission('promotion')) ;

create policy mast_delete on public.promotion_missions for DELETE to authenticated using (public.mast_has_permission('promotion')) ;

grant select on public.competitions to authenticated;

grant insert,update,delete on public.competitions to authenticated;

create policy mast_select on public.competitions for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.competitions for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.competitions for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.competitions for DELETE to authenticated using (public.mast_has_permission('contest')) ;

grant select on public.team_matching_teams to authenticated;

grant insert,update,delete on public.team_matching_teams to authenticated;

create policy mast_select on public.team_matching_teams for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.team_matching_teams for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.team_matching_teams for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.team_matching_teams for DELETE to authenticated using (public.mast_has_permission('contest')) ;

drop policy mast_insert on public.team_matching_teams;

drop policy mast_update on public.team_matching_teams;

drop policy mast_delete on public.team_matching_teams;

create policy mast_insert on public.team_matching_teams for INSERT to authenticated with check (public.mast_has_permission('contest') or (leader_id=public.mast_current_member_id() and exists(select 1 from public.team_matching_members where id=public.mast_current_member_id() and is_leader))) ;

create policy mast_update on public.team_matching_teams for UPDATE to authenticated using (public.mast_has_permission('contest') or leader_id=public.mast_current_member_id()) with check (public.mast_has_permission('contest') or leader_id=public.mast_current_member_id()) ;

create policy mast_delete on public.team_matching_teams for DELETE to authenticated using (public.mast_has_permission('contest') or leader_id=public.mast_current_member_id()) ;

grant select on public.team_matching_team_members to authenticated;

grant insert,update,delete on public.team_matching_team_members to authenticated;

create policy mast_select on public.team_matching_team_members for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.team_matching_team_members for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.team_matching_team_members for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.team_matching_team_members for DELETE to authenticated using (public.mast_has_permission('contest')) ;

drop policy mast_insert on public.team_matching_team_members;

drop policy mast_update on public.team_matching_team_members;

drop policy mast_delete on public.team_matching_team_members;

create policy mast_insert on public.team_matching_team_members for INSERT to authenticated with check (public.mast_has_permission('contest') or public.mast_owns_team(team_id)) ;

create policy mast_update on public.team_matching_team_members for UPDATE to authenticated using (public.mast_has_permission('contest') or public.mast_owns_team(team_id) or member_id=public.mast_current_member_id()) with check (public.mast_has_permission('contest') or public.mast_owns_team(team_id) or member_id=public.mast_current_member_id()) ;

create policy mast_delete on public.team_matching_team_members for DELETE to authenticated using (public.mast_has_permission('contest') or public.mast_owns_team(team_id)) ;

grant select on public.team_matching_applications to authenticated;

grant insert,update,delete on public.team_matching_applications to authenticated;

create policy mast_select on public.team_matching_applications for SELECT to authenticated using (public.mast_has_permission('contest') or applicant_id=public.mast_current_member_id() or public.mast_owns_team(team_id)) ;

create policy mast_insert on public.team_matching_applications for INSERT to authenticated with check (applicant_id=public.mast_current_member_id() and status='pending') ;

create policy mast_update on public.team_matching_applications for UPDATE to authenticated using (public.mast_has_permission('contest') or applicant_id=public.mast_current_member_id() or public.mast_owns_team(team_id)) with check (public.mast_has_permission('contest') or applicant_id=public.mast_current_member_id() or public.mast_owns_team(team_id)) ;

create policy mast_delete on public.team_matching_applications for DELETE to authenticated using (public.mast_has_permission('contest') or applicant_id=public.mast_current_member_id() or public.mast_owns_team(team_id)) ;

grant select on public.team_matching_leader_applications to authenticated;

grant insert,update,delete on public.team_matching_leader_applications to authenticated;

create policy mast_select on public.team_matching_leader_applications for SELECT to authenticated using (public.mast_has_permission('contest') or member_id=public.mast_current_member_id()) ;

create policy mast_insert on public.team_matching_leader_applications for INSERT to authenticated with check (member_id=public.mast_current_member_id() and status='pending') ;

create policy mast_update on public.team_matching_leader_applications for UPDATE to authenticated using (public.mast_has_permission('contest') or member_id=public.mast_current_member_id()) with check (public.mast_has_permission('contest') or member_id=public.mast_current_member_id()) ;

create policy mast_delete on public.team_matching_leader_applications for DELETE to authenticated using (public.mast_has_permission('contest') or member_id=public.mast_current_member_id()) ;

grant select on public.team_matching_member_score_events to authenticated;

grant insert,update,delete on public.team_matching_member_score_events to authenticated;

create policy mast_select on public.team_matching_member_score_events for SELECT to authenticated using (public.mast_has_permission('evaluation') or member_id=public.mast_current_member_id()) ;

create policy mast_insert on public.team_matching_member_score_events for INSERT to authenticated with check (public.mast_has_permission('evaluation')) ;

create policy mast_update on public.team_matching_member_score_events for UPDATE to authenticated using (public.mast_has_permission('evaluation')) with check (public.mast_has_permission('evaluation')) ;

create policy mast_delete on public.team_matching_member_score_events for DELETE to authenticated using (public.mast_has_permission('evaluation')) ;

grant select on public.team_matching_awards to authenticated;

grant insert,update,delete on public.team_matching_awards to authenticated;

create policy mast_select on public.team_matching_awards for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.team_matching_awards for INSERT to authenticated with check (public.mast_has_permission('evaluation')) ;

create policy mast_update on public.team_matching_awards for UPDATE to authenticated using (public.mast_has_permission('evaluation')) with check (public.mast_has_permission('evaluation')) ;

create policy mast_delete on public.team_matching_awards for DELETE to authenticated using (public.mast_has_permission('evaluation')) ;

drop policy mast_insert on public.team_matching_awards;

create policy mast_insert on public.team_matching_awards for INSERT to authenticated with check (public.mast_has_permission('evaluation') or public.mast_owns_team(team_id)) ;

grant select on public.team_matching_peer_reviews to authenticated;

grant insert,update,delete on public.team_matching_peer_reviews to authenticated;

create policy mast_select on public.team_matching_peer_reviews for SELECT to authenticated using (public.mast_has_permission('evaluation') or reviewer_id=public.mast_current_member_id() or reviewee_id=public.mast_current_member_id()) ;

create policy mast_insert on public.team_matching_peer_reviews for INSERT to authenticated with check (reviewer_id=public.mast_current_member_id() and public.mast_on_team(team_id) and exists(select 1 from public.team_matching_team_members where team_id=team_matching_peer_reviews.team_id and member_id=reviewee_id and status='active') and exists(select 1 from public.team_matching_teams where id=team_id and peer_review_open and (peer_review_deadline is null or peer_review_deadline>now()))) ;

create policy mast_update on public.team_matching_peer_reviews for UPDATE to authenticated using (public.mast_has_permission('evaluation') or (reviewer_id=public.mast_current_member_id() and public.mast_on_team(team_id) and exists(select 1 from public.team_matching_team_members where team_id=team_matching_peer_reviews.team_id and member_id=reviewee_id and status='active') and exists(select 1 from public.team_matching_teams where id=team_id and peer_review_open and (peer_review_deadline is null or peer_review_deadline>now())))) with check (public.mast_has_permission('evaluation') or (reviewer_id=public.mast_current_member_id() and public.mast_on_team(team_id) and exists(select 1 from public.team_matching_team_members where team_id=team_matching_peer_reviews.team_id and member_id=reviewee_id and status='active') and exists(select 1 from public.team_matching_teams where id=team_id and peer_review_open and (peer_review_deadline is null or peer_review_deadline>now())))) ;

create policy mast_delete on public.team_matching_peer_reviews for DELETE to authenticated using (public.mast_has_permission('evaluation')) ;

grant select on public.team_matching_notifications to authenticated;

grant insert,update,delete on public.team_matching_notifications to authenticated;

create policy mast_select on public.team_matching_notifications for SELECT to authenticated using (public.mast_has_permission('notice') or member_id=public.mast_current_member_id() or (public.mast_current_member_id() is not null and member_id is null)) ;

create policy mast_insert on public.team_matching_notifications for INSERT to authenticated with check (public.mast_has_permission('notice') or (public.mast_current_member_id() is not null and member_id is not null and (member_id=public.mast_current_member_id() or exists(select 1 from public.team_matching_teams t where t.leader_id=team_matching_notifications.member_id and exists(select 1 from public.team_matching_applications a where a.team_id=t.id and a.applicant_id=public.mast_current_member_id())) or exists(select 1 from public.team_matching_applications a where a.applicant_id=team_matching_notifications.member_id and public.mast_owns_team(a.team_id))))) ;

create policy mast_update on public.team_matching_notifications for UPDATE to authenticated using (public.mast_has_permission('notice')) with check (public.mast_has_permission('notice')) ;

create policy mast_delete on public.team_matching_notifications for DELETE to authenticated using (public.mast_has_permission('notice')) ;

grant select on public.team_matching_notification_reads to authenticated;

grant insert,update,delete on public.team_matching_notification_reads to authenticated;

create policy mast_all on public.team_matching_notification_reads for ALL to authenticated using (member_id=public.mast_current_member_id()) with check (member_id=public.mast_current_member_id()) ;

grant select on public.activity_sessions to authenticated;

grant insert,update,delete on public.activity_sessions to authenticated;

create policy mast_select on public.activity_sessions for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.activity_sessions for INSERT to authenticated with check (public.mast_has_permission('attendance')) ;

create policy mast_update on public.activity_sessions for UPDATE to authenticated using (public.mast_has_permission('attendance')) with check (public.mast_has_permission('attendance')) ;

create policy mast_delete on public.activity_sessions for DELETE to authenticated using (public.mast_has_permission('attendance')) ;

revoke select on public.activity_sessions from authenticated;

grant select (id,title,description,session_type,starts_at,ends_at,location,base_points,counts_in_activity_weather,status,created_by_member_id,created_at,updated_at,attendance_code_enabled,attendance_open_at,attendance_close_at,session_mode,is_orientation,target_generations,ontime_at) on public.activity_sessions to authenticated;

create or replace view public.mast_activity_sessions_client with (security_barrier=true) as select id,title,description,session_type,starts_at,ends_at,location,base_points,counts_in_activity_weather,status,created_by_member_id,created_at,updated_at,case when public.mast_has_permission('attendance') then attendance_code else null end as attendance_code,attendance_code_enabled,attendance_open_at,attendance_close_at,session_mode,is_orientation,target_generations,ontime_at from public.activity_sessions where public.mast_current_member_id() is not null; grant select on public.mast_activity_sessions_client to authenticated; revoke all on public.mast_activity_sessions_client from anon,public;

grant select on public.activity_attendance_records to authenticated;

grant insert,update,delete on public.activity_attendance_records to authenticated;

create policy mast_select on public.activity_attendance_records for SELECT to authenticated using (public.mast_has_permission('attendance') or member_id=public.mast_current_legacy_id()) ;

create policy mast_insert on public.activity_attendance_records for INSERT to authenticated with check (public.mast_has_permission('attendance')) ;

create policy mast_update on public.activity_attendance_records for UPDATE to authenticated using (public.mast_has_permission('attendance')) with check (public.mast_has_permission('attendance')) ;

create policy mast_delete on public.activity_attendance_records for DELETE to authenticated using (public.mast_has_permission('attendance')) ;

grant select on public.promotion_mission_assignments to authenticated;

grant insert,update,delete on public.promotion_mission_assignments to authenticated;

create policy mast_select on public.promotion_mission_assignments for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.promotion_mission_assignments for INSERT to authenticated with check (public.mast_has_permission('promotion')) ;

create policy mast_update on public.promotion_mission_assignments for UPDATE to authenticated using (public.mast_has_permission('promotion') or member_id=public.mast_current_legacy_id()) with check (public.mast_has_permission('promotion') or member_id=public.mast_current_legacy_id()) ;

create policy mast_delete on public.promotion_mission_assignments for DELETE to authenticated using (public.mast_has_permission('promotion')) ;

grant select on public.promotion_proofs to authenticated;

grant insert,update,delete on public.promotion_proofs to authenticated;

create policy mast_select on public.promotion_proofs for SELECT to authenticated using (public.mast_has_permission('promotion') or member_id=public.mast_current_legacy_id()) ;

create policy mast_insert on public.promotion_proofs for INSERT to authenticated with check (public.mast_has_permission('promotion') or (member_id=public.mast_current_legacy_id() and exists(select 1 from public.promotion_mission_assignments a where a.id=assignment_id and a.member_id=public.mast_current_legacy_id() and a.mission_id=promotion_proofs.mission_id and (a.late_until_at is null or now()<=a.late_until_at)))) ;

create policy mast_update on public.promotion_proofs for UPDATE to authenticated using (public.mast_has_permission('promotion') or (member_id=public.mast_current_legacy_id() and exists(select 1 from public.promotion_mission_assignments a where a.id=assignment_id and a.member_id=public.mast_current_legacy_id() and a.mission_id=promotion_proofs.mission_id and (a.late_until_at is null or now()<=a.late_until_at)))) with check (public.mast_has_permission('promotion') or (member_id=public.mast_current_legacy_id() and exists(select 1 from public.promotion_mission_assignments a where a.id=assignment_id and a.member_id=public.mast_current_legacy_id() and a.mission_id=promotion_proofs.mission_id and (a.late_until_at is null or now()<=a.late_until_at)))) ;

create policy mast_delete on public.promotion_proofs for DELETE to authenticated using (public.mast_has_permission('promotion') or (member_id=public.mast_current_legacy_id() and exists(select 1 from public.promotion_mission_assignments a where a.id=assignment_id and a.member_id=public.mast_current_legacy_id() and a.mission_id=promotion_proofs.mission_id and (a.late_until_at is null or now()<=a.late_until_at)))) ;

grant select on public.promotion_assignment_status_logs to authenticated;

grant insert,update,delete on public.promotion_assignment_status_logs to authenticated;

create policy mast_select on public.promotion_assignment_status_logs for SELECT to authenticated using (public.mast_has_permission('promotion')) ;

create policy mast_insert on public.promotion_assignment_status_logs for INSERT to authenticated with check (public.mast_has_permission('promotion')) ;

create policy mast_update on public.promotion_assignment_status_logs for UPDATE to authenticated using (public.mast_has_permission('promotion')) with check (public.mast_has_permission('promotion')) ;

create policy mast_delete on public.promotion_assignment_status_logs for DELETE to authenticated using (public.mast_has_permission('promotion')) ;

grant select on public.competition_teams to authenticated;

grant insert,update,delete on public.competition_teams to authenticated;

create policy mast_select on public.competition_teams for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.competition_teams for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.competition_teams for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.competition_teams for DELETE to authenticated using (public.mast_has_permission('contest')) ;

grant select on public.competition_team_members to authenticated;

grant insert,update,delete on public.competition_team_members to authenticated;

create policy mast_select on public.competition_team_members for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.competition_team_members for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.competition_team_members for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.competition_team_members for DELETE to authenticated using (public.mast_has_permission('contest')) ;

grant select on public.competition_applications to authenticated;

grant insert,update,delete on public.competition_applications to authenticated;

create policy mast_select on public.competition_applications for SELECT to authenticated using (public.mast_current_member_id() is not null) ;

create policy mast_insert on public.competition_applications for INSERT to authenticated with check (public.mast_has_permission('contest')) ;

create policy mast_update on public.competition_applications for UPDATE to authenticated using (public.mast_has_permission('contest')) with check (public.mast_has_permission('contest')) ;

create policy mast_delete on public.competition_applications for DELETE to authenticated using (public.mast_has_permission('contest')) ;

grant select on public.mast26_interview_days to authenticated;

grant insert,update,delete on public.mast26_interview_days to authenticated;

create policy mast_select on public.mast26_interview_days for SELECT to authenticated using (public.mast_has_permission(null)) ;

create policy mast_insert on public.mast26_interview_days for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_update on public.mast26_interview_days for UPDATE to authenticated using (public.mast_has_permission('members')) with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.mast26_interview_days for DELETE to authenticated using (public.mast_has_permission('members')) ;

grant select on public.mast26_interview_reservation_events to authenticated;

grant insert,update,delete on public.mast26_interview_reservation_events to authenticated;

create policy mast_select on public.mast26_interview_reservation_events for SELECT to authenticated using (public.mast_has_permission(null)) ;

create policy mast_insert on public.mast26_interview_reservation_events for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_update on public.mast26_interview_reservation_events for UPDATE to authenticated using (public.mast_has_permission('members')) with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.mast26_interview_reservation_events for DELETE to authenticated using (public.mast_has_permission('members')) ;

grant select on public.mast26_interview_reservations to authenticated;

grant insert,update,delete on public.mast26_interview_reservations to authenticated;

create policy mast_select on public.mast26_interview_reservations for SELECT to authenticated using (public.mast_has_permission(null)) ;

create policy mast_insert on public.mast26_interview_reservations for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_update on public.mast26_interview_reservations for UPDATE to authenticated using (public.mast_has_permission('members')) with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.mast26_interview_reservations for DELETE to authenticated using (public.mast_has_permission('members')) ;

grant select on public.mast26_interview_sessions to authenticated;

grant insert,update,delete on public.mast26_interview_sessions to authenticated;

create policy mast_select on public.mast26_interview_sessions for SELECT to authenticated using (public.mast_has_permission(null)) ;

create policy mast_insert on public.mast26_interview_sessions for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_update on public.mast26_interview_sessions for UPDATE to authenticated using (public.mast_has_permission('members')) with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.mast26_interview_sessions for DELETE to authenticated using (public.mast_has_permission('members')) ;

grant select on public.mast26_interview_slots to authenticated;

grant insert,update,delete on public.mast26_interview_slots to authenticated;

create policy mast_select on public.mast26_interview_slots for SELECT to authenticated using (public.mast_has_permission(null)) ;

create policy mast_insert on public.mast26_interview_slots for INSERT to authenticated with check (public.mast_has_permission('members')) ;

create policy mast_update on public.mast26_interview_slots for UPDATE to authenticated using (public.mast_has_permission('members')) with check (public.mast_has_permission('members')) ;

create policy mast_delete on public.mast26_interview_slots for DELETE to authenticated using (public.mast_has_permission('members')) ;

revoke all on public.admin_auth from public,anon,authenticated; grant all on public.admin_auth to service_role;

revoke all on public.team_matching_member_passwords from public,anon,authenticated; grant all on public.team_matching_member_passwords to service_role;

revoke all on public.team_matching_password_resets from public,anon,authenticated; grant all on public.team_matching_password_resets to service_role;

revoke all on public.team_matching_password_reset_attempts from public,anon,authenticated; grant all on public.team_matching_password_reset_attempts to service_role;

revoke all on public.mast_member_archive from public,anon,authenticated; grant all on public.mast_member_archive to service_role;

revoke all on public.mast_roster_imports from public,anon,authenticated; grant all on public.mast_roster_imports to service_role;

revoke all on public.mast_auth_members from public,anon,authenticated; grant all on public.mast_auth_members to service_role;

revoke all on public.mast_auth_attempts from public,anon,authenticated; grant all on public.mast_auth_attempts to service_role;

revoke all on public.mast_authorized_sessions from public,anon,authenticated; grant all on public.mast_authorized_sessions to service_role;

grant select on public.activity_attendance_summary_view to authenticated;

grant select on public.promotion_assignment_status_view to authenticated;

grant select on public.promotion_member_progress_view to authenticated;

grant select on public.promotion_mission_progress_view to authenticated;

grant select on public.team_matching_peer_review_summary_view to authenticated;


-- Revoke public execution of definer/auth RPCs; expose only audited session-scoped calls.
do $$ declare r record; begin
 for r in select oid::regprocedure::text sig from pg_proc where pronamespace='public'::regnamespace loop
  execute format('revoke execute on function %s from public,anon,authenticated',r.sig);
  execute format('grant execute on function %s to service_role',r.sig);
 end loop;
end $$;
grant execute on function public.mast_current_member_id(),public.mast_current_legacy_id(),public.mast_has_permission(text),public.mast_owns_team(integer),public.mast_on_team(integer) to authenticated;



-- Database-side invariants apply even when callers bypass the app UI.
create or replace function public.mast_guard_write() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare privileged boolean;
begin
 if auth.role() is distinct from 'authenticated' then return new; end if;
 if tg_table_name='team_matching_members' then
  if tg_op='UPDATE' and not public.mast_has_permission('members') and ((to_jsonb(new)-'is_leader'-'updated_at') is distinct from (to_jsonb(old)-'is_leader'-'updated_at')) then raise exception '회원 수정 권한이 없습니다.' using errcode='42501'; end if;
  if tg_op='UPDATE' and (new.role is distinct from old.role or new.admin_sections is distinct from old.admin_sections or new.roster_status is distinct from old.roster_status) and not public.mast_has_permission(null) then raise exception '관리자 권한 변경은 전체 관리자만 가능합니다.' using errcode='42501'; end if;
 elsif tg_table_name='team_matching_teams' then
  if tg_op='UPDATE' and new.leader_id is distinct from old.leader_id and not public.mast_has_permission('contest') then raise exception '팀장 변경 권한이 없습니다.' using errcode='42501'; end if;
 elsif tg_table_name='team_matching_applications' then
  privileged:=public.mast_has_permission('contest') or public.mast_owns_team(new.team_id);
  if tg_op='UPDATE' and (new.applicant_id is distinct from old.applicant_id or new.team_id is distinct from old.team_id) then raise exception '지원서 계정은 변경할 수 없습니다.' using errcode='42501'; end if;
  if not privileged and new.status not in ('pending','cancelled','withdrawn') then raise exception '지원 승인 권한이 없습니다.' using errcode='42501'; end if;
 elsif tg_table_name='team_matching_leader_applications' then
  if tg_op='UPDATE' and new.member_id is distinct from old.member_id then raise exception '계정은 변경할 수 없습니다.' using errcode='42501'; end if;
  if not public.mast_has_permission('contest') and new.status not in ('pending','cancelled','withdrawn') then raise exception '승인 권한이 없습니다.' using errcode='42501'; end if;
 elsif tg_table_name='team_matching_team_members' then
  if tg_op='UPDATE' and (new.member_id is distinct from old.member_id or new.team_id is distinct from old.team_id) then raise exception '회원 연결은 변경할 수 없습니다.' using errcode='42501'; end if;
  if not (public.mast_has_permission('contest') or public.mast_owns_team(new.team_id)) and (new.member_id<>public.mast_current_member_id() or new.status<>'leave_requested' or old.status<>'active') then raise exception '팀원 변경 권한이 없습니다.' using errcode='42501'; end if;
 elsif tg_table_name='promotion_mission_assignments' then
  if not public.mast_has_permission('promotion') then
   if tg_op<>'UPDATE' or new.member_id is distinct from old.member_id or new.mission_id is distinct from old.mission_id or new.due_at is distinct from old.due_at or new.late_until_at is distinct from old.late_until_at or new.reviewed_at is distinct from old.reviewed_at or new.reviewed_by_member_id is distinct from old.reviewed_by_member_id or new.status<>'submitted' or old.status not in ('assigned','pending','rejected','submitted') or (old.late_until_at is not null and now()>old.late_until_at) then raise exception '본인 인증 제출만 가능합니다.' using errcode='42501'; end if;
   new.submitted_at:=now();
  end if;
 elsif tg_table_name='team_matching_peer_reviews' then
  if tg_op='UPDATE' and (new.reviewer_id is distinct from old.reviewer_id or new.reviewee_id is distinct from old.reviewee_id or new.team_id is distinct from old.team_id) then raise exception '평가 대상은 변경할 수 없습니다.' using errcode='42501'; end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['team_matching_members','team_matching_teams','team_matching_applications','team_matching_leader_applications','team_matching_team_members','promotion_mission_assignments','team_matching_peer_reviews'] loop
  execute format('drop trigger if exists mast_guard_write on public.%I',t);
  execute format('create trigger mast_guard_write before insert or update on public.%I for each row execute function public.mast_guard_write()',t);
 end loop;
end $$;

-- Authentication secrets are server-only. Telephone matching is an explicit product requirement.
create or replace function public.request_member_password_reset(p_name text,p_school text,p_generation text,p_phone text) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare m public.team_matching_members%rowtype; matches integer; tok text; expires timestamptz:=now()+interval '30 minutes'; k text:=lower(regexp_replace(coalesce(p_name,''),'\s','','g'));
begin
 if not public.mast_check_auth_rate('reset-account:'||k,10,3600) then return jsonb_build_object('error','시도 횟수가 너무 많습니다. 1시간 후 다시 시도해 주세요.'); end if;
 select count(*) into matches from public.team_matching_members where roster_status='active' and lower(regexp_replace(name,'\s','','g'))=k and lower(regexp_replace(school,'\s','','g'))=lower(regexp_replace(coalesce(p_school,''),'\s','','g')) and generation::text=regexp_replace(coalesce(p_generation,''),'[^0-9]','','g') and regexp_replace(coalesce(phone,''),'[^0-9]','','g')=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') and regexp_replace(coalesce(p_phone,''),'[^0-9]','','g')~'^010[0-9]{8}$';
 if matches<>1 then return jsonb_build_object('error','입력한 정보가 회원 정보와 일치하지 않습니다.'); end if;
 select * into m from public.team_matching_members where roster_status='active' and lower(regexp_replace(name,'\s','','g'))=k and lower(regexp_replace(school,'\s','','g'))=lower(regexp_replace(p_school,'\s','','g')) and generation::text=regexp_replace(p_generation,'[^0-9]','','g') and regexp_replace(phone,'[^0-9]','','g')=regexp_replace(p_phone,'[^0-9]','','g') for update;
 tok:=encode(extensions.gen_random_bytes(32),'hex');
 delete from public.team_matching_password_resets where member_id=m.id;
 insert into public.team_matching_password_resets(token_hash,member_id,password_version,expires_at) values(encode(extensions.digest(tok,'sha256'),'hex'),m.id,m.password_hash,expires);
 return jsonb_build_object('token',tok,'expires_at',expires);
end $$;
create or replace function public.mast_initialize_password(p_name text,p_school text,p_generation text,p_phone text,p_password text,p_member_id integer) returns jsonb
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare m public.team_matching_members%rowtype;
begin
 if p_password is null or length(p_password)<8 or length(p_password)>128 or p_password!~'[A-Za-z]' or p_password!~'[0-9]' then return jsonb_build_object('error','영문과 숫자를 포함해 8자 이상 입력해 주세요.'); end if;
 select * into m from public.team_matching_members where id=p_member_id and roster_status='active' and lower(trim(name))=lower(trim(p_name)) and lower(regexp_replace(school,'\s','','g'))=lower(regexp_replace(coalesce(p_school,''),'\s','','g')) and generation::text=regexp_replace(coalesce(p_generation,''),'[^0-9]','','g') and regexp_replace(coalesce(phone,''),'[^0-9]','','g')=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') and regexp_replace(coalesce(p_phone,''),'[^0-9]','','g')~'^010[0-9]{8}$' for update;
 if not found then return jsonb_build_object('error','가입할 때 적은 학교·기수·전화번호를 확인해 주세요.'); end if;
 if coalesce(m.password_hash,'')<>'' then return jsonb_build_object('error','이미 비밀번호가 설정된 계정입니다.'); end if;
 update public.team_matching_members set password_hash=extensions.crypt(p_password,extensions.gen_salt('bf',12)),password_set_at=now() where id=m.id;
 return (to_jsonb(m)-'password_hash'-'password_set_at')||jsonb_build_object('credential_version',(select password_hash from public.team_matching_members where id=m.id));
end $$;
revoke all on function public.request_member_password_reset(text,text,text,text),public.mast_initialize_password(text,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.request_member_password_reset(text,text,text,text),public.mast_initialize_password(text,text,text,text,text,integer) to service_role;


CREATE OR REPLACE FUNCTION public.complete_member_password_reset(p_token text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_reset public.team_matching_password_resets%rowtype;
  v_current_hash text;
  v_next_hash text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception '재설정 링크가 유효하지 않습니다. 운영진에게 새 링크를 요청해 주세요.';
  end if;
  if p_password is null or length(p_password) < 8 or length(p_password) > 128
      or p_password !~ '[A-Za-z]' or p_password !~ '[0-9]' then
    raise exception '비밀번호는 영문과 숫자를 포함해 8~128자로 입력해 주세요.';
  end if;
  -- Lock the member first, matching issuance lock order to avoid deadlocks.
  select m.password_hash into v_current_hash
    from public.team_matching_members m
    join public.team_matching_password_resets r on r.member_id = m.id
    where m.roster_status = 'active' and r.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    for update of m;
  select * into v_reset from public.team_matching_password_resets
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or not exists (select 1 from public.team_matching_members where id=v_reset.member_id and roster_status='active') or v_reset.used_at is not null or v_reset.expires_at <= clock_timestamp()
      or v_reset.password_version is distinct from v_current_hash then
    raise exception '재설정 링크가 만료되었거나 이미 사용되었습니다. 운영진에게 새 링크를 요청해 주세요.';
  end if;
  v_next_hash := extensions.crypt(p_password, extensions.gen_salt('bf',12));
  update public.team_matching_members
    set password_hash = v_next_hash, password_set_at = clock_timestamp()
    where id = v_reset.member_id;
  if to_regclass('public.team_matching_member_passwords') is not null then
    execute 'update public.team_matching_member_passwords set password_hash = $1 where member_id = $2'
      using v_next_hash, v_reset.member_id;
  end if;
  update public.team_matching_password_resets set used_at = clock_timestamp()
    where token_hash = v_reset.token_hash;
  return jsonb_build_object('ok', true);
end;
$function$
;


create or replace function public.mast_archive_member(p_member_id integer) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.team_matching_members%rowtype;
begin
 if not public.mast_has_permission(null) then raise exception '전체 관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select * into m from public.team_matching_members where id=p_member_id and roster_status='active' for update;
 if not found then raise exception '회원을 찾을 수 없습니다.'; end if;
 insert into public.mast_member_archive(source_table,source_id,import_batch,reason,original_record) values('team_matching_members',m.id::text,'admin-'||clock_timestamp()::text,'admin_archived',to_jsonb(m));
 update public.team_matching_members set roster_status='archived' where id=m.id;
 update public.members set status='inactive' where id=m.mast_member_id;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.mast_archive_member(integer) from public,anon;
grant execute on function public.mast_archive_member(integer) to authenticated,service_role;

-- Attendance codes, windows and late points are verified by the server, not the client.
create or replace function public.mast_submit_attendance(p_session_id uuid,p_code text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.activity_sessions%rowtype; r public.activity_attendance_records%rowtype; mid uuid:=public.mast_current_legacy_id(); late_minutes integer:=0; st text:='present'; pts numeric;
begin
 if mid is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
 if not public.mast_check_auth_rate('attendance:'||mid::text,20,600) then return jsonb_build_object('error','시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.'); end if;
 select * into s from public.activity_sessions where id=p_session_id;
 if not found then return jsonb_build_object('error','모임 정보를 찾을 수 없습니다.'); end if;
 if s.status in ('closed','cancelled','finished','completed') or now()>coalesce(s.attendance_close_at,s.ends_at,s.starts_at+interval '6 hours') then return jsonb_build_object('error','출석 가능 시간이 지났습니다.'); end if;
 if now()<coalesce(s.attendance_open_at,s.starts_at) then return jsonb_build_object('error','아직 출석 가능 시간이 아닙니다.'); end if;
 if s.attendance_code_enabled and coalesce(trim(s.attendance_code),'')<>'' and trim(s.attendance_code)<>coalesce(trim(p_code),'') then return jsonb_build_object('error','출석 인증코드가 일치하지 않습니다.'); end if;
 if exists(select 1 from public.activity_attendance_records where session_id=s.id and member_id=mid) then return jsonb_build_object('error','이미 출석이 완료된 모임입니다.'); end if;
 if s.ontime_at is not null then late_minutes:=floor(extract(epoch from(now()-s.ontime_at))/60)::integer; end if;
 pts:=coalesce(s.base_points,1);
 if late_minutes>30 then st:='late';pts:=-3; elsif late_minutes>10 then st:='late';pts:=-1; end if;
 insert into public.activity_attendance_records(session_id,member_id,status,checked_at,points) values(s.id,mid,st,now(),pts) returning * into r;
 return to_jsonb(r)||jsonb_build_object('lateInfo',jsonb_build_object('status',st,'points',case when st='present' then 0 else pts end,'minutesLate',late_minutes));
end $$;
revoke all on function public.mast_submit_attendance(uuid,text) from public,anon;
grant execute on function public.mast_submit_attendance(uuid,text) to authenticated,service_role;

-- Captures are private. Existing public URLs stop working; authenticated users receive short-lived signed URLs.
do $$ declare p record; begin
 for p in select policyname from pg_policies where schemaname='storage' and tablename='objects' loop execute format('drop policy %I on storage.objects',p.policyname); end loop;
end $$;
update storage.buckets set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'] where id='proofs';
create policy mast_read_files on storage.objects for select to authenticated using (
 (bucket_id='missions' and public.mast_current_member_id() is not null) or
 (bucket_id='proofs' and (public.mast_has_permission('promotion') or (storage.foldername(name))[1]=public.mast_current_legacy_id()::text or exists(select 1 from public.promotion_proofs p where p.proof_file_path=name and p.member_id=public.mast_current_legacy_id())))
);
create policy mast_insert_files on storage.objects for insert to authenticated with check (
 (bucket_id='missions' and public.mast_has_permission('promotion')) or (bucket_id='proofs' and (public.mast_has_permission('promotion') or (storage.foldername(name))[1]=public.mast_current_legacy_id()::text))
);
create policy mast_update_files on storage.objects for update to authenticated using (
 (bucket_id='missions' and public.mast_has_permission('promotion')) or (bucket_id='proofs' and (public.mast_has_permission('promotion') or (storage.foldername(name))[1]=public.mast_current_legacy_id()::text))
) with check ((bucket_id='missions' and public.mast_has_permission('promotion')) or (bucket_id='proofs' and (public.mast_has_permission('promotion') or (storage.foldername(name))[1]=public.mast_current_legacy_id()::text)));
create policy mast_delete_files on storage.objects for delete to authenticated using (
 (bucket_id='missions' and public.mast_has_permission('promotion')) or (bucket_id='proofs' and (public.mast_has_permission('promotion') or (storage.foldername(name))[1]=public.mast_current_legacy_id()::text or exists(select 1 from public.promotion_proofs p where p.proof_file_path=name and p.member_id=public.mast_current_legacy_id())))
);
notify pgrst,'reload schema';
commit;
