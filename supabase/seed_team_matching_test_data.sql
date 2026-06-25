-- MAST 공모전 팀매칭 기능 테스트 데이터
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.
-- 모든 테스트 데이터는 이름/제목에 "[테스트]" 접두어를 붙입니다.
-- id, created_at, updated_at은 identity/default 컬럼이므로 직접 넣지 않습니다.

do $$
declare
  v_admin_id integer;
  v_leader_id integer;
  v_member_id integer;
  v_pending_id integer;
  v_rejected_id integer;
  v_rainbow_id integer;
  v_sunny_id integer;
  v_partly_id integer;
  v_clear_cloud_id integer;
  v_dark_cloud_id integer;
  v_rain_id integer;
  v_open_contest_id integer;
  v_done_contest_id integer;
  v_hidden_contest_id integer;
  v_recruiting_team_id integer;
  v_finished_team_id integer;
  v_has_peer_review_open boolean;
  v_has_peer_review_deadline boolean;
begin
  -- 0) 기존 테스트 데이터 정리
  delete from public.team_matching_awards
  where team_id in (
    select id from public.team_matching_teams where introduction like '[테스트]%'
  )
  or contest_id in (
    select id from public.team_matching_contests where title like '[테스트]%'
  );

  delete from public.team_matching_peer_reviews
  where team_id in (
    select id from public.team_matching_teams where introduction like '[테스트]%'
  )
  or reviewer_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  )
  or reviewee_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  );

  delete from public.team_matching_member_score_events
  where member_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  );

  delete from public.team_matching_notifications
  where title like '[테스트]%'
  or member_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  );

  delete from public.team_matching_applications
  where team_id in (
    select id from public.team_matching_teams where introduction like '[테스트]%'
  )
  or applicant_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  );

  delete from public.team_matching_team_members
  where team_id in (
    select id from public.team_matching_teams where introduction like '[테스트]%'
  )
  or member_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  );

  delete from public.team_matching_teams
  where introduction like '[테스트]%';

  delete from public.team_matching_leader_applications
  where member_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  )
  or message like '[contest_id]%[테스트]%';

  delete from public.team_matching_announcements
  where title like '[테스트]%';

  delete from public.team_matching_contests
  where title like '[테스트]%';

  delete from public.team_matching_member_passwords
  where member_id in (
    select id from public.team_matching_members where name like '[테스트]%'
  );

  delete from public.team_matching_members
  where name like '[테스트]%';

  -- 1) 테스트 회원
  insert into public.team_matching_members (name, school, major, generation, role, is_leader)
  values
    ('[테스트] 관리자', 'MAST대학교', '운영학과', 1, 'admin', true),
    ('[테스트] 팀장 민준', 'MAST대학교', '기획학과', 1, 'member', true),
    ('[테스트] 승인 팀원 서연', 'MAST대학교', '디자인학과', 1, 'member', false),
    ('[테스트] 대기 지원 하윤', 'MAST대학교', '컴퓨터공학과', 2, 'member', false),
    ('[테스트] 거절 지원 지우', 'MAST대학교', '경영학과', 2, 'member', false),
    ('[테스트] 날씨 무지개', 'MAST대학교', '데이터학과', 1, 'member', false),
    ('[테스트] 날씨 화창', 'MAST대학교', '데이터학과', 1, 'member', false),
    ('[테스트] 날씨 구름낀해', 'MAST대학교', '데이터학과', 1, 'member', false),
    ('[테스트] 날씨 흐림', 'MAST대학교', '데이터학과', 1, 'member', false),
    ('[테스트] 날씨 먹구름', 'MAST대학교', '데이터학과', 1, 'member', false),
    ('[테스트] 날씨 비', 'MAST대학교', '데이터학과', 1, 'member', false);

  select id into v_admin_id from public.team_matching_members where name = '[테스트] 관리자';
  select id into v_leader_id from public.team_matching_members where name = '[테스트] 팀장 민준';
  select id into v_member_id from public.team_matching_members where name = '[테스트] 승인 팀원 서연';
  select id into v_pending_id from public.team_matching_members where name = '[테스트] 대기 지원 하윤';
  select id into v_rejected_id from public.team_matching_members where name = '[테스트] 거절 지원 지우';
  select id into v_rainbow_id from public.team_matching_members where name = '[테스트] 날씨 무지개';
  select id into v_sunny_id from public.team_matching_members where name = '[테스트] 날씨 화창';
  select id into v_partly_id from public.team_matching_members where name = '[테스트] 날씨 구름낀해';
  select id into v_clear_cloud_id from public.team_matching_members where name = '[테스트] 날씨 흐림';
  select id into v_dark_cloud_id from public.team_matching_members where name = '[테스트] 날씨 먹구름';
  select id into v_rain_id from public.team_matching_members where name = '[테스트] 날씨 비';

  -- 2) 테스트 공모전
  insert into public.team_matching_contests (
    title, organizer, prize, registration_period, registration_deadline, category,
    description, link, max_team_size, duplicate_allowed, has_presentation,
    presentation_date, hackathon_date, linked_commercialization, has_certificate,
    award_count, notes, is_active
  )
  values
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
      '테스트 데이터입니다. 운영 데이터와 구분해서 사용하세요.',
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
    );

  select id into v_open_contest_id from public.team_matching_contests where title = '[테스트] 팀매칭 전체 플로우 공모전';
  select id into v_done_contest_id from public.team_matching_contests where title = '[테스트] 마감 이후 결과등록 공모전';
  select id into v_hidden_contest_id from public.team_matching_contests where title = '[테스트] 숨김 처리 공모전';

  -- 3) 공모전별 팀장 신청
  -- team_matching_leader_applications에 contest_id 컬럼이 없는 환경을 고려해 message에 [contest_id] 마커를 저장합니다.
  insert into public.team_matching_leader_applications (member_id, status, message)
  values
    (v_leader_id, 'accepted', '[contest_id]' || chr(10) || v_open_contest_id || chr(10) || chr(10) || '[테스트] 기획형 팀장으로 참여하고 싶습니다. 역할 분배와 일정 관리를 맡겠습니다.'),
    (v_pending_id, 'pending', '[contest_id]' || chr(10) || v_open_contest_id || chr(10) || chr(10) || '[테스트] 개발형 팀장 신청입니다. MVP 제작 경험이 있어 팀을 이끌고 싶습니다.'),
    (v_rejected_id, 'rejected', '[contest_id]' || chr(10) || v_open_contest_id || chr(10) || chr(10) || '[테스트] 자료가 부족한 팀장 신청 예시입니다.');

  -- 4) 팀 생성
  insert into public.team_matching_teams (
    contest_id, leader_id, required_members, current_members, introduction,
    prize_distribution, needed_roles, work_style, meeting_style,
    interest_areas, personality_tags, skill_tags, status, open_chat_url
  )
  values (
    v_open_contest_id,
    v_leader_id,
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
  )
  returning id into v_recruiting_team_id;

  begin
    insert into public.team_matching_teams (
      contest_id, leader_id, required_members, current_members, introduction,
      prize_distribution, needed_roles, work_style, meeting_style,
      interest_areas, personality_tags, skill_tags, status, closed_at, open_chat_url, award_result
    )
    values (
      v_done_contest_id,
      v_leader_id,
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
      'awarded'
    )
    returning id into v_finished_team_id;
  exception
    when check_violation then
      insert into public.team_matching_teams (
        contest_id, leader_id, required_members, current_members, introduction,
        prize_distribution, needed_roles, work_style, meeting_style,
        interest_areas, personality_tags, skill_tags, status, closed_at, open_chat_url, award_result
      )
      values (
        v_done_contest_id,
        v_leader_id,
        8,
        8,
        '[테스트] 결과등록 및 동료평가 확인용 완료 팀입니다. 단, 현재 DB status 제약상 finished가 막혀 closed로 저장됐습니다.',
        '기여도 기반 배분',
        '["발표·피칭","보고서 작성","데이터 분석"]'::jsonb,
        '오프라인 집중 활동',
        '주 2회 회의',
        '["헬스케어","사업화","AI 활용"]'::jsonb,
        '["협업 지향","피드백 수용형","꼼꼼함"]'::jsonb,
        '["발표·피칭","보고서 작성","AI 활용"]'::jsonb,
        'closed',
        now(),
        'https://open.kakao.com/o/test-finished-mast',
        'awarded'
      )
      returning id into v_finished_team_id;
      raise notice 'team_matching_teams.status 제약에 finished가 없어 완료 팀은 closed로 저장했습니다. 동료평가 실제 화면 테스트에는 finished 허용이 필요합니다.';
  end;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_matching_teams'
      and column_name = 'peer_review_open'
  ) into v_has_peer_review_open;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_matching_teams'
      and column_name = 'peer_review_deadline'
  ) into v_has_peer_review_deadline;

  if v_has_peer_review_open then
    execute 'update public.team_matching_teams set peer_review_open = true where id = $1'
    using v_finished_team_id;
  else
    raise notice 'peer_review_open 컬럼이 없어 동료평가 열림 상태 저장은 건너뜁니다.';
  end if;

  if v_has_peer_review_deadline then
    execute 'update public.team_matching_teams set peer_review_deadline = $1 where id = $2'
    using now() + interval '7 days', v_finished_team_id;
  else
    raise notice 'peer_review_deadline 컬럼이 없어 동료평가 마감일 저장은 건너뜁니다.';
  end if;

  -- 5) 팀원
  insert into public.team_matching_team_members (team_id, member_id, status)
  values
    (v_recruiting_team_id, v_leader_id, 'active'),
    (v_recruiting_team_id, v_member_id, 'active'),
    (v_finished_team_id, v_leader_id, 'active'),
    (v_finished_team_id, v_member_id, 'active'),
    (v_finished_team_id, v_rainbow_id, 'active'),
    (v_finished_team_id, v_sunny_id, 'active'),
    (v_finished_team_id, v_partly_id, 'active'),
    (v_finished_team_id, v_clear_cloud_id, 'active'),
    (v_finished_team_id, v_dark_cloud_id, 'active'),
    (v_finished_team_id, v_rain_id, 'active');

  -- 6) 지원서 상태별 데이터
  insert into public.team_matching_applications (
    team_id, applicant_id, survey_purpose, survey_intensity, survey_role,
    survey_experience, survey_strengths, survey_team_style, capability_appeal,
    personality_tags, skill_tags, availability_note, message, status, reject_reason, leader_priority
  )
  values
    (
      v_recruiting_team_id, v_member_id,
      '[테스트] 팀에 이미 승인된 지원서입니다.',
      '주 2~3회 참여 가능', '디자인·PPT',
      '교내 공모전 1회', '시각화와 자료 정리',
      '일정이 명확한 팀 선호', 'PPT와 발표자료 제작이 가능합니다.',
      '["꼼꼼함","협업 지향"]'::jsonb,
      '["PPT 제작","디자인"]'::jsonb,
      '평일 저녁 가능', '승인 상태 예시입니다.', 'accepted', null, 1
    ),
    (
      v_recruiting_team_id, v_pending_id,
      '[테스트] pending 지원서입니다. 팀장이 승인/거절할 수 있습니다.',
      '주 1~2회 참여 가능', '웹 개발',
      '해커톤 1회', '빠른 프로토타입 제작',
      '온라인 중심 선호', 'React 기반 화면 구현이 가능합니다.',
      '["실행력이 빠름","소통 적극형"]'::jsonb,
      '["웹 개발","UI/UX 설계"]'::jsonb,
      '주말 가능', '대기 상태 예시입니다.', 'pending', null, 2
    ),
    (
      v_recruiting_team_id, v_rejected_id,
      '[테스트] rejected 지원서입니다.',
      '시간 조율 필요', '시장조사',
      '없음', '자료 조사',
      '느슨한 팀 선호', '시장조사 일부 가능합니다.',
      '["경청형"]'::jsonb,
      '["시장조사"]'::jsonb,
      '시험기간 제외', '거절 상태 예시입니다.', 'rejected', '테스트용 거절 사유입니다.', 3
    );

  -- 7) 결과/수상
  insert into public.team_matching_awards (team_id, contest_id, award_result)
  values
    (v_finished_team_id, v_done_contest_id, '최우수상 / 테스트 수상 결과 / 상금 100만원');

  -- 8) 활동날씨용 오프라인 점수 이벤트
  insert into public.team_matching_member_score_events (member_id, event_type, points, verified, metadata)
  values
    (v_rainbow_id, 'offline_event', 30, true, '{"source":"test_seed","label":"무지개 테스트"}'::jsonb),
    (v_sunny_id, 'offline_event', 29, true, '{"source":"test_seed","label":"화창 테스트"}'::jsonb),
    (v_partly_id, 'offline_event', 25, true, '{"source":"test_seed","label":"구름낀 해 테스트"}'::jsonb),
    (v_clear_cloud_id, 'offline_event', 23, true, '{"source":"test_seed","label":"흐림 테스트"}'::jsonb),
    (v_dark_cloud_id, 'offline_event', 18, true, '{"source":"test_seed","label":"먹구름 테스트"}'::jsonb),
    (v_rain_id, 'offline_event', 10, true, '{"source":"test_seed","label":"비 테스트"}'::jsonb),
    (v_member_id, 'offline_event', 26, true, '{"source":"test_seed","label":"승인 팀원 테스트"}'::jsonb),
    (v_pending_id, 'offline_event', 16, true, '{"source":"test_seed","label":"대기 지원자 테스트"}'::jsonb);

  -- 9) 활동날씨/동료평가용 평가 데이터
  insert into public.team_matching_peer_reviews (
    team_id, reviewer_id, reviewee_id, participation, sincerity, collaboration, communication, comment
  )
  values
    (v_finished_team_id, v_leader_id, v_rainbow_id, 5, 5, 5, 5, '[테스트] 매우 안정적으로 참여했습니다.'),
    (v_finished_team_id, v_leader_id, v_sunny_id, 5, 5, 5, 5, '[테스트] 좋은 협업 태도를 보였습니다.'),
    (v_finished_team_id, v_leader_id, v_partly_id, 4, 4, 5, 4, '[테스트] 전반적으로 좋았습니다.'),
    (v_finished_team_id, v_leader_id, v_clear_cloud_id, 4, 4, 4, 4, '[테스트] 안정적으로 참여했습니다.'),
    (v_finished_team_id, v_leader_id, v_dark_cloud_id, 3, 4, 3, 3, '[테스트] 참여 보완이 조금 필요합니다.'),
    (v_finished_team_id, v_leader_id, v_rain_id, 2, 3, 2, 2, '[테스트] 다음 활동에서 회복이 필요합니다.'),
    (v_finished_team_id, v_member_id, v_leader_id, 5, 5, 5, 5, '[테스트] 팀 운영이 좋았습니다.'),
    (v_finished_team_id, v_rainbow_id, v_member_id, 4, 5, 4, 5, '[테스트] 팀원 평가 예시입니다.');

  -- 10) 공지/알림
  insert into public.team_matching_announcements (tag, tag_tone, title, body, is_published)
  values
    ('공지', 'notice', '[테스트] 팀매칭 기능 테스트 공지', '공모전 등록, 팀장 신청, 팀 지원, 결과 등록, 동료평가, 활동날씨 확인용 테스트 공지입니다.', true);

  insert into public.team_matching_notifications (member_id, type, title, body, href)
  values
    (null, 'notice', '[테스트] 전체 알림', '전체 회원에게 보이는 알림 예시입니다.', '/contests'),
    (v_leader_id, 'application_pending', '[테스트] 지원서 도착', '대기 지원 하윤님의 지원서가 도착했습니다.', '/my/teams'),
    (v_member_id, 'application_result', '[테스트] 지원 승인', '팀 지원이 승인되었습니다. 내 팀에서 확인하세요.', '/my/teams'),
    (v_pending_id, 'leader_application_result', '[테스트] 팀장 신청 대기', '팀장 신청이 검토 대기 상태입니다.', '/leader-application');

  raise notice '테스트 데이터 생성 완료';
  raise notice '회원 첫 로그인 테스트: [테스트] 팀장 민준 / MAST대학교 / 1기';
  raise notice '관리자 테스트: [테스트] 관리자';
  raise notice '활동날씨 등급 테스트 회원: [테스트] 날씨 무지개, 화창, 구름낀해, 흐림, 먹구름, 비';
  raise notice '공모전: %, %, 숨김 id %', v_open_contest_id, v_done_contest_id, v_hidden_contest_id;
  raise notice '팀: 모집중 %, 결과등록/동료평가 %', v_recruiting_team_id, v_finished_team_id;
end $$;
