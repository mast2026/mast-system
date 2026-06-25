-- 동료평가 승인 상태 컬럼 추가
-- Supabase SQL Editor에서 한 번 실행하세요.
-- status: pending(대기) / approved(승인) / rejected(거부)
-- 승인(approved)된 동료평가만 활동날씨 계산에 반영됩니다.

alter table public.team_matching_peer_reviews
  add column if not exists status text default 'pending';
