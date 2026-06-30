-- 임원진 직책별 관리자 권한: 회원별로 접근 가능한 관리자 섹션 키 배열을 저장
-- 예: ["attendance","promotion"] → 출석/홍보 관리자 기능만 사용 가능
alter table public.team_matching_members
  add column if not exists admin_sections jsonb default '[]'::jsonb;
