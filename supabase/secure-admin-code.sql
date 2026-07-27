-- =============================================================
--  MAST 관리자 코드 서버 검증 (번들 노출 제거)
--  Supabase SQL Editor에서 통째로 실행하세요.
--
--  목적:
--   - 지금은 관리자 코드(MAST-ADMIN 등)를 브라우저 JS 번들 안에서
--     문자열 비교 → 누구나 개발자도구로 꺼내볼 수 있음.
--   - 이 스크립트는 "코드 하나로 진입"이라는 UX는 그대로 두고,
--     실제 코드값은 DB 안에만 두고(해시 저장) 검증도 서버에서 수행.
--     클라이언트는 입력값만 보내고 맞냐/틀리냐 결과만 받음.
-- =============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) 코드 해시를 담는 비공개 단일행 테이블 -----------------------------
create table if not exists public.admin_auth (
  id          int primary key default 1,
  code_hash   text not null,
  updated_at  timestamptz not null default now(),
  constraint admin_auth_singleton check (id = 1)
);

-- RLS 켜고 정책은 만들지 않음 => anon/authenticated는 이 표를 읽거나 쓸 수 없음.
-- (SECURITY DEFINER 함수만 우회 접근)
alter table public.admin_auth enable row level security;
revoke all on public.admin_auth from anon, authenticated;

-- 2) 코드 설정/변경 함수 (SQL Editor에서만 호출; 클라이언트에 노출 X) --------
create or replace function public.set_admin_code(p_code text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.admin_auth (id, code_hash, updated_at)
  values (1, crypt(p_code, gen_salt('bf')), now())
  on conflict (id) do update
    set code_hash = excluded.code_hash, updated_at = now();
$$;
revoke all on function public.set_admin_code(text) from anon, authenticated;

-- 3) 코드 검증 함수 (클라이언트가 호출) --------------------------------
--    맞으면 관리자 회원 1명(민감 컬럼 제외)을 반환, 틀리면 null.
create or replace function public.verify_admin_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ok boolean;
  v_member jsonb;
begin
  select (code_hash = crypt(p_code, code_hash))
    into v_ok
    from public.admin_auth
   where id = 1;

  if not coalesce(v_ok, false) then
    return null;              -- 코드 불일치
  end if;

  select to_jsonb(m) - 'password_hash' - 'password_set_at'
    into v_member
    from public.team_matching_members m
   where m.role in ('admin','manager','professor')
   order by m.role asc, m.id asc
   limit 1;

  return v_member;            -- 코드 일치 (관리자 없으면 null)
end;
$$;

-- 클라이언트(anon)가 검증 함수만 실행 가능하게
grant execute on function public.verify_admin_code(text) to anon, authenticated;

-- 4) ▼▼▼ 여기서 실제 관리자 코드를 한 번 설정하세요 ▼▼▼ ------------------
--    (이 값은 DB에만 저장되고 번들에는 안 들어갑니다. 임원들에게만 공유)
--    짧은 코드는 온라인 무차별 대입에 약하니 12자 이상 권장.
select public.set_admin_code('여기에-실제-관리자코드-입력');

-- 확인용(선택): 맞으면 회원 json, 틀리면 null 이 나오면 정상
-- select public.verify_admin_code('여기에-실제-관리자코드-입력');
-- select public.verify_admin_code('틀린코드');
