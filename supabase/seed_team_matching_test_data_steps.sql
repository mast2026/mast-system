-- MAST 팀매칭 전체 기능 테스트 데이터 - 단계형 버전
-- Supabase SQL Editor에서 "블록 0~5"를 순서대로 실행하세요.
-- 이미 들어간 테스트 회원 3명은 유지하고, 부족한 데이터만 채웁니다.
-- 모든 데이터는 [테스트] 접두어로 구분합니다.

-- =========================================================
-- 블록 0. 결과등록/동료평가 테스트에 필요한 컬럼 보강
-- 이미 있으면 아무 변화 없습니다.
-- =========================================================
alter table public.team_matching_teams
  add column if not exists peer_review_open boolean not null default false;

alter table public.team_matching_teams
  add column if not exists peer_review_deadline timestamp with time zone;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'team_matching_teams_status_check'
      and conrelid = 'public.team_matching_teams'::regclass
  ) then
    alter table public.team_matching_teams
      drop constraint team_matching_teams_status_check;
  end if;

  alter table public.team_matching_teams
    add constraint team_matching_teams_status_check
    check (status = any (array['recruiting'::text, 'matched'::text, 'closed'::text, 'finished'::text]));
end $$;

-- =========================================================
-- 블록 1. 테스트 회원 전체
-- 첫 로그인 테스트를 위해 password_hash는 넣지 않습니다.
-- =========================================================
insert into public.team_matching_members (name, school, major, generation, role, is_leader)
select *
from (values
  ('[테스트] 팀장 민준', 'MAST대학교', '기획학과', 1, 'member', true),
  ('[테스트] 관리자', 'MAST대학교', '운영학과', 1, 'admin', true),
  ('[테스트] 승인 팀원 서연', 'MAST대학교', '디자인학과', 1, 'member', false),
  ('[테스트] 대기 지원 하윤', 'MAST대학교', '컴퓨터공학과', 2, 'member', false),
  ('[테스트] 거절 지원 지우', 'MAST대학교', '경영학과', 2, 'member', false),
  ('[테스트] 날씨 무지개', 'MAST대학교', '데이터학과', 1, 'member', false),
  ('[테스트] 날씨 화창', 'MAST대학교', '데이터학과', 1, 'member', false),
  ('[테스트] 날씨 구름낀해', 'MAST대학교', '데이터학과', 1, 'member', false),
  ('[테스트] 날씨 흐림', 'MAST대학교', '데이터학과', 1, 'member', false),
  ('[테스트] 날씨 먹구름', 'MAST대학교', '데이터학과', 1, 'member', false),
  ('[테스트] 날씨 비', 'MAST대학교', '데이터학과', 1, 'member', false)
) as v(name, school, major, generation, role, is_leader)
where not exists (
  select 1 from public.team_matching_members m where m.name = v.name
);

-- =========================================================
-- 블록 2. 공모전 3종
-- 1) 진행 중 2) 마감/결과등록 3) 숨김
-- =========================================================
insert into public.team_matching_contests (
  title, organizer, prize, registration_period, registration_deadline, category,
  description, link, max_team_size, duplicate_allowed, has_presentation,
  presentation_date, hackathon_date, linked_commercialization, has_certificate,
  award_count, notes, is_active
)
select *
from (values
  (
    '[테스트] 팀매칭 전체 플로우 공모전',
    'MAST 운영진',
    '대상 300만원',
    to_char(current_date, 'YYYY.MM.DD') || ' ~ ' || to_char(current_date + 14, 'YYYY.MM.DD'),
    to_char(current_date + 14, 'YYYY-MM-DD'),
    '아이디어·기획·개발',
    '공모전 목록, 상세, 팀장 신청, 팀 생성, 지원, 승인/거절 흐름을 확인하기 위한 테스트 공모전입니다.',
    'https://example.com/mast-test-contest',
    5,
    true,
    true,
    to_char(current_date + 21, 'YYYY-MM-DD'),
    to_char(current_date + 28, 'YYYY-MM-DD'),
    true,
    true,
    '3팀',
    '운영 데이터와 구분되는 테스트 공모전입니다.',
    true
  ),
  (
    '[테스트] 마감 이후 결과등록 공모전',
    'MAST 운영진',
    '최우수상 100만원',
    to_char(current_date - 20, 'YYYY.MM.DD') || ' ~ ' || to_char(current_date - 3, 'YYYY.MM.DD'),
    to_char(current_date - 3, 'YYYY-MM-DD'),
    '헬스케어·데이터',
    '결과 등록, 수상 등록, 동료평가 화면을 확인하기 위한 마감된 테스트 공모전입니다.',
    'https://example.com/mast-finished-contest',
    8,
    false,
    true,
    to_char(current_date - 1, 'YYYY-MM-DD'),
    to_char(current_date - 8, 'YYYY-MM-DD'),
    false,
    true,
    '2팀',
    '마감 이후 사용자 흐름 확인용입니다.',
    true
  ),
  (
    '[테스트] 숨김 처리 공모전',
    'MAST 운영진',
    '참가상',
    to_char(current_date, 'YYYY.MM.DD') || ' ~ ' || to_char(current_date + 7, 'YYYY.MM.DD'),
    to_char(current_date + 7, 'YYYY-MM-DD'),
    '운영 테스트',
    'is_active=false 공모전이 회원 화면에서 숨겨지는지 확인하기 위한 데이터입니다.',
    'https://example.com/hidden',
    4,
    true,
    false,
    null,
    null,
    false,
    false,
    '0팀',
    '관리자 화면에서만 확인하세요.',
    false
  )
) as v(
  title, organizer, prize, registration_period, registration_deadline, category,
  description, link, max_team_size, duplicate_allowed, has_presentation,
  presentation_date, hackathon_date, linked_commercialization, has_certificate,
  award_count, notes, is_active
)
where not exists (
  select 1 from public.team_matching_contests c where c.title = v.title
);

-- =========================================================
-- 블록 3. 공모전별 팀장 신청 + 팀 생성
-- team_matching_leader_applications에 contest_id가 없는 DB라 message 마커를 사용합니다.
-- =========================================================
insert into public.team_matching_leader_applications (member_id, status, message)
select m.id, 'accepted',
       '[contest_id]' || chr(10) || c.id || chr(10) || chr(10) || '[테스트] 기획형 팀장으로 참여하고 싶습니다.'
from public.team_matching_members m
join public.team_matching_contests c on c.title = '[테스트] 팀매칭 전체 플로우 공모전'
where m.name = '[테스트] 팀장 민준'
  and not exists (
    select 1 from public.team_matching_leader_applications a
    where a.member_id = m.id and a.status = 'accepted' and a.message like '[contest_id]%' || c.id || '%'
  );

insert into public.team_matching_leader_applications (member_id, status, message)
select m.id, 'pending',
       '[contest_id]' || chr(10) || c.id || chr(10) || chr(10) || '[테스트] 개발형 팀장 신청입니다.'
from public.team_matching_members m
join public.team_matching_contests c on c.title = '[테스트] 팀매칭 전체 플로우 공모전'
where m.name = '[테스트] 대기 지원 하윤'
  and not exists (
    select 1 from public.team_matching_leader_applications a
    where a.member_id = m.id and a.status = 'pending'
  );

insert into public.team_matching_leader_applications (member_id, status, message)
select m.id, 'rejected',
       '[contest_id]' || chr(10) || c.id || chr(10) || chr(10) || '[테스트] 자료가 부족한 팀장 신청 예시입니다.'
from public.team_matching_members m
join public.team_matching_contests c on c.title = '[테스트] 팀매칭 전체 플로우 공모전'
where m.name = '[테스트] 거절 지원 지우'
  and not exists (
    select 1 from public.team_matching_leader_applications a
    where a.member_id = m.id and a.status = 'rejected'
  );

insert into public.team_matching_teams (
  contest_id, leader_id, required_members, current_members, introduction,
  prize_distribution, needed_roles, work_style, meeting_style,
  interest_areas, personality_tags, skill_tags, status, open_chat_url
)
select
  c.id,
  m.id,
  5,
  2,
  '[테스트] 모집중 팀입니다. 아이디어 기획, 시장조사, 발표자료 제작, 웹 프로토타입 제작을 함께할 팀원을 찾습니다.',
  '수상 시 기여도와 역할 수행도를 함께 반영해 배분합니다.',
  '["아이디어 기획","시장조사","PPT 제작","웹 개발"]'::jsonb,
  '온라인 중심 + 필요 시 오프라인 회의',
  '주 1회 온라인 회의',
  '["헬스케어","데이터","서비스 기획"]'::jsonb,
  '["책임감이 강함","소통 적극형","목표 지향형"]'::jsonb,
  '["아이디어 기획","PPT 제작","웹 개발","데이터 분석"]'::jsonb,
  'recruiting',
  'https://open.kakao.com/o/test-mast'
from public.team_matching_contests c
join public.team_matching_members m on m.name = '[테스트] 팀장 민준'
where c.title = '[테스트] 팀매칭 전체 플로우 공모전'
  and not exists (
    select 1 from public.team_matching_teams t where t.introduction like '[테스트] 모집중 팀%'
  );

insert into public.team_matching_teams (
  contest_id, leader_id, required_members, current_members, introduction,
  prize_distribution, needed_roles, work_style, meeting_style,
  interest_areas, personality_tags, skill_tags, status, closed_at,
  open_chat_url, award_result, peer_review_open, peer_review_deadline
)
select
  c.id,
  m.id,
  8,
  8,
  '[테스트] 결과등록 및 동료평가 확인용 완료 팀입니다.',
  '기여도 기반 배분',
  '["발표·피칭","보고서 작성","데이터 분석"]'::jsonb,
  '오프라인 집중 활동',
  '주 2회 회의',
  '["헬스케어","사업화","AI 활용"]'::jsonb,
  '["협업 지향","피드백 수용형","꼼꼼함"]'::jsonb,
  '["발표·피칭","보고서 작성","AI 활용"]'::jsonb,
  'finished',
  now(),
  'https://open.kakao.com/o/test-finished-mast',
  'awarded',
  true,
  now() + interval '7 days'
from public.team_matching_contests c
join public.team_matching_members m on m.name = '[테스트] 팀장 민준'
where c.title = '[테스트] 마감 이후 결과등록 공모전'
  and not exists (
    select 1 from public.team_matching_teams t where t.introduction like '[테스트] 결과등록%'
  );

-- =========================================================
-- 블록 4. 팀원 + 지원서 상태별 데이터
-- =========================================================
insert into public.team_matching_team_members (team_id, member_id, status)
select t.id, m.id, 'active'
from public.team_matching_teams t
join public.team_matching_members m on m.name in (
  '[테스트] 팀장 민준',
  '[테스트] 승인 팀원 서연'
)
where t.introduction like '[테스트] 모집중 팀%'
  and not exists (
    select 1 from public.team_matching_team_members tm
    where tm.team_id = t.id and tm.member_id = m.id
  );

insert into public.team_matching_team_members (team_id, member_id, status)
select t.id, m.id, 'active'
from public.team_matching_teams t
join public.team_matching_members m on m.name in (
  '[테스트] 팀장 민준',
  '[테스트] 승인 팀원 서연',
  '[테스트] 날씨 무지개',
  '[테스트] 날씨 화창',
  '[테스트] 날씨 구름낀해',
  '[테스트] 날씨 흐림',
  '[테스트] 날씨 먹구름',
  '[테스트] 날씨 비'
)
where t.introduction like '[테스트] 결과등록%'
  and not exists (
    select 1 from public.team_matching_team_members tm
    where tm.team_id = t.id and tm.member_id = m.id
  );

insert into public.team_matching_applications (
  team_id, applicant_id, survey_purpose, survey_intensity, survey_role,
  survey_experience, survey_strengths, survey_team_style, capability_appeal,
  personality_tags, skill_tags, availability_note, message, status, reject_reason, leader_priority
)
select t.id, m.id,
  '[테스트] 팀에 이미 승인된 지원서입니다.',
  '주 2~3회 참여 가능', '디자인·PPT', '교내 공모전 1회',
  '시각화와 자료 정리', '일정이 명확한 팀 선호',
  'PPT와 발표자료 제작이 가능합니다.',
  '["꼼꼼함","협업 지향"]'::jsonb,
  '["PPT 제작","디자인"]'::jsonb,
  '평일 저녁 가능', '승인 상태 예시입니다.', 'accepted', null, 1
from public.team_matching_teams t
join public.team_matching_members m on m.name = '[테스트] 승인 팀원 서연'
where t.introduction like '[테스트] 모집중 팀%'
  and not exists (select 1 from public.team_matching_applications a where a.team_id = t.id and a.applicant_id = m.id);

insert into public.team_matching_applications (
  team_id, applicant_id, survey_purpose, survey_intensity, survey_role,
  survey_experience, survey_strengths, survey_team_style, capability_appeal,
  personality_tags, skill_tags, availability_note, message, status, reject_reason, leader_priority
)
select t.id, m.id,
  '[테스트] pending 지원서입니다. 팀장이 승인/거절할 수 있습니다.',
  '주 1~2회 참여 가능', '웹 개발', '해커톤 1회',
  '빠른 프로토타입 제작', '온라인 중심 선호',
  'React 기반 화면 구현이 가능합니다.',
  '["실행력이 빠름","소통 적극형"]'::jsonb,
  '["웹 개발","UI/UX 설계"]'::jsonb,
  '주말 가능', '대기 상태 예시입니다.', 'pending', null, 2
from public.team_matching_teams t
join public.team_matching_members m on m.name = '[테스트] 대기 지원 하윤'
where t.introduction like '[테스트] 모집중 팀%'
  and not exists (select 1 from public.team_matching_applications a where a.team_id = t.id and a.applicant_id = m.id);

insert into public.team_matching_applications (
  team_id, applicant_id, survey_purpose, survey_intensity, survey_role,
  survey_experience, survey_strengths, survey_team_style, capability_appeal,
  personality_tags, skill_tags, availability_note, message, status, reject_reason, leader_priority
)
select t.id, m.id,
  '[테스트] rejected 지원서입니다.',
  '시간 조율 필요', '시장조사', '없음',
  '자료 조사', '느슨한 팀 선호',
  '시장조사 일부 가능합니다.',
  '["경청형"]'::jsonb,
  '["시장조사"]'::jsonb,
  '시험기간 제외', '거절 상태 예시입니다.', 'rejected', '테스트용 거절 사유입니다.', 3
from public.team_matching_teams t
join public.team_matching_members m on m.name = '[테스트] 거절 지원 지우'
where t.introduction like '[테스트] 모집중 팀%'
  and not exists (select 1 from public.team_matching_applications a where a.team_id = t.id and a.applicant_id = m.id);

-- =========================================================
-- 블록 5. 활동날씨/동료평가/수상/공지/알림
-- =========================================================
insert into public.team_matching_awards (team_id, contest_id, award_result)
select t.id, c.id, '최우수상 / 테스트 수상 결과 / 상금 100만원'
from public.team_matching_teams t
join public.team_matching_contests c on c.title = '[테스트] 마감 이후 결과등록 공모전'
where t.introduction like '[테스트] 결과등록%'
  and not exists (select 1 from public.team_matching_awards a where a.team_id = t.id);

insert into public.team_matching_member_score_events (member_id, event_type, points, verified, metadata)
select m.id, 'offline_event', v.points, true, jsonb_build_object('source', 'test_seed', 'label', v.label)
from (values
  ('[테스트] 날씨 무지개', 30, '무지개 테스트'),
  ('[테스트] 날씨 화창', 29, '화창 테스트'),
  ('[테스트] 날씨 구름낀해', 25, '구름낀 해 테스트'),
  ('[테스트] 날씨 흐림', 23, '흐림 테스트'),
  ('[테스트] 날씨 먹구름', 18, '먹구름 테스트'),
  ('[테스트] 날씨 비', 10, '비 테스트'),
  ('[테스트] 승인 팀원 서연', 26, '승인 팀원 테스트'),
  ('[테스트] 대기 지원 하윤', 16, '대기 지원자 테스트')
) as v(name, points, label)
join public.team_matching_members m on m.name = v.name
where not exists (
  select 1 from public.team_matching_member_score_events e
  where e.member_id = m.id and e.metadata->>'source' = 'test_seed'
);

insert into public.team_matching_peer_reviews (
  team_id, reviewer_id, reviewee_id, participation, sincerity, collaboration, communication, comment
)
select t.id, reviewer.id, reviewee.id, v.participation, v.sincerity, v.collaboration, v.communication, v.comment
from (values
  ('[테스트] 팀장 민준', '[테스트] 날씨 무지개', 5, 5, 5, 5, '[테스트] 매우 안정적으로 참여했습니다.'),
  ('[테스트] 팀장 민준', '[테스트] 날씨 화창', 5, 5, 5, 5, '[테스트] 좋은 협업 태도를 보였습니다.'),
  ('[테스트] 팀장 민준', '[테스트] 날씨 구름낀해', 4, 4, 5, 4, '[테스트] 전반적으로 좋았습니다.'),
  ('[테스트] 팀장 민준', '[테스트] 날씨 흐림', 4, 4, 4, 4, '[테스트] 안정적으로 참여했습니다.'),
  ('[테스트] 팀장 민준', '[테스트] 날씨 먹구름', 3, 4, 3, 3, '[테스트] 참여 보완이 조금 필요합니다.'),
  ('[테스트] 팀장 민준', '[테스트] 날씨 비', 2, 3, 2, 2, '[테스트] 다음 활동에서 회복이 필요합니다.'),
  ('[테스트] 승인 팀원 서연', '[테스트] 팀장 민준', 5, 5, 5, 5, '[테스트] 팀 운영이 좋았습니다.')
) as v(reviewer_name, reviewee_name, participation, sincerity, collaboration, communication, comment)
join public.team_matching_teams t on t.introduction like '[테스트] 결과등록%'
join public.team_matching_members reviewer on reviewer.name = v.reviewer_name
join public.team_matching_members reviewee on reviewee.name = v.reviewee_name
where not exists (
  select 1 from public.team_matching_peer_reviews r
  where r.team_id = t.id and r.reviewer_id = reviewer.id and r.reviewee_id = reviewee.id
);

insert into public.team_matching_announcements (tag, tag_tone, title, body, is_published)
select '공지', 'notice', '[테스트] 팀매칭 기능 테스트 공지',
       '공모전 등록, 팀장 신청, 팀 지원, 결과 등록, 동료평가, 활동날씨 확인용 테스트 공지입니다.',
       true
where not exists (
  select 1 from public.team_matching_announcements a where a.title = '[테스트] 팀매칭 기능 테스트 공지'
);

insert into public.team_matching_notifications (member_id, type, title, body, href)
select null, 'notice', '[테스트] 전체 알림', '전체 회원에게 보이는 알림 예시입니다.', '/contests'
where not exists (
  select 1 from public.team_matching_notifications n where n.title = '[테스트] 전체 알림'
);

insert into public.team_matching_notifications (member_id, type, title, body, href)
select m.id, 'application_pending', '[테스트] 지원서 도착', '대기 지원 하윤님의 지원서가 도착했습니다.', '/my/teams'
from public.team_matching_members m
where m.name = '[테스트] 팀장 민준'
  and not exists (
    select 1 from public.team_matching_notifications n where n.member_id = m.id and n.title = '[테스트] 지원서 도착'
  );
