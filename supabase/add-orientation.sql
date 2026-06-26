-- OT(오리엔테이션) 모임 표시 + 대상 기수 컬럼 추가
-- Supabase SQL Editor에서 한 번 실행하세요.
--
-- is_orientation: 이 모임이 OT(오리엔테이션)인지
-- target_generations: 이 OT의 대상 기수들(쉼표 구분, 예: '1,2' = 2기 OT지만 1기도 필참)
--
-- 활동날씨 출석 계산:
--  - 신입 기수는 자기 기수의 OT가 예정(미래)돼 있고 아직 안 열렸으면 출석을 '기본치(100%)'로 반영
--  - 그 OT 날짜가 지나면 실제 출석률(오프라인25+온라인5)로 자동 전환
--  - OT가 정의되지 않은 기존 기수는 처음부터 실제 출석률

alter table public.activity_sessions
  add column if not exists is_orientation boolean default false;

alter table public.activity_sessions
  add column if not exists target_generations text;
