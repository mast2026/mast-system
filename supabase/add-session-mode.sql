-- 출석 모임 유형(오프라인/온라인) 컬럼 추가
-- Supabase SQL Editor에서 한 번 실행하세요.
-- session_mode: 'offline'(오프라인) / 'online'(온라인)
-- 활동날씨의 출석 30점 = 오프라인 25점 + 온라인 5점으로 가중 반영됩니다.

alter table public.activity_sessions
  add column if not exists session_mode text default 'offline';
