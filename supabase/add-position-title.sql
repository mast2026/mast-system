-- 임원진 직책명 컬럼 추가
-- Supabase SQL Editor에서 한 번 실행하세요.
-- position_title: 비어있으면 일반 회원, 값이 있으면 임원진(예: 회장, 부회장, 총무)

alter table public.team_matching_members
  add column if not exists position_title text;
