# MAST 동아리 통합 시스템

React + Vite와 기존 Supabase `team_matching_*` 테이블만 사용하는 팀매칭 MVP입니다.

## 시작하기

```bash
cp .env.example .env
npm install
npm run dev
```

`.env`에 다음 값을 설정합니다.

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Supabase Auth는 사용하지 않습니다. 로그인 화면에서 `team_matching_members.name`과 일치하는 이름을 입력하면 회원 전체 정보를 localStorage의 `team_matching_current_member` 키에 보관합니다.

## 2차 핵심 기능

- 운영진 공모전 등록·수정·활성/비활성화
- 회원 팀장 권한 신청 및 운영진 승인·거절
- 팀장 권한 기반 팀 생성과 리더 자동 팀원 등록
- 팀 지원서 작성과 중복 지원 방지
- 팀장 지원자 조회·승인·거절
- 승인 시 팀원 등록, 현재 인원 갱신, 정원 도달 시 모집 마감
- 내 지원 현황에 팀·공모전 정보 표시
- 성향·역량·참여도·경험·환경 태그를 프론트엔드 상수로 관리

## 3차 팀 운영 기능

- 팀장 전용 팀 관리 화면에서 오픈채팅 링크 등록·수정
- 팀장과 active 팀원에게만 오픈채팅 링크 조회 및 입장 버튼 제공
- 일반 팀원의 사유 입력 후 팀 나가기
- 팀장의 active 팀원 제외와 사유 기록
- active 팀원 기준 현재 인원 재계산 및 1명 미만 방지
- 정원 미달 시 모집 다시 열기, 수동 모집 마감
- 3차 컬럼을 런타임에서 감지하고, 없을 때 관련 기능만 비활성화

3차 기능은 다음 기존 테이블 컬럼을 사용합니다.

- `team_matching_teams.open_chat_url`
- `team_matching_team_members.status`
- `team_matching_team_members.left_at`
- `team_matching_team_members.leave_reason`
- `team_matching_team_members.removed_by_member_id`

컬럼이 없는 DB에서도 조회 화면은 계속 동작합니다. 팀 관리 화면에 `DB 컬럼 추가 필요` 안내가 표시되며 오픈채팅 저장, 팀 나가기, 팀원 제외 기능은 비활성화됩니다.

## 4차 활동날씨

다음 데이터 소스를 읽어 회원별 활동날씨를 계산합니다.

- `team_matching_peer_reviews`: 공모전 동료평가
- `promotion_member_progress_view`: 에타 홍보 활동
- `team_matching_member_score_events`: 오프라인 참석·인증 활동
- `team_matching_awards`: 수상 성과 보너스

첨부 기획안의 반영 비율을 적용합니다.

- 에타 홍보 40점
- 오프라인 참석 30점
- 공모전 동료평가 30점
- 신규 회원 초기 점수 70점(홍보 40 + 오프라인 30)
- 수상 기록은 핵심 40:30:30 비율 밖에서 최대 5점 보너스, 최종 점수는 100점 상한

점수 구간에 따라 맑음, 대체로 맑음, 구름 조금, 비, 천둥번개 아이콘을 표시합니다.

## 5차 디자인

- 모바일 회원 홈의 활동날씨 카드와 부드러운 하늘색·노란색 오브제
- 옅은 하늘색 배경과 노란색·파란색 오브를 활용한 시각 체계
- 데스크톱 관리자 활동날씨 표와 개선된 사이드바·통계 카드
- `/activity-weather`, `/admin/activity-weather` 화면 추가

## 권한

- `role`이 `admin` 또는 `manager`: `/admin` 접근 가능
- `is_leader`가 `true`: 팀 생성 권한 표시
- `is_leader`가 `false`인 회원은 `/leader-application`에서 권한 신청

## 데이터 원칙

- 지정된 8개 `team_matching_*` 테이블만 사용
- `competition_*` 및 신규 테이블 미사용
- `promotion_*` 중 이번 단계에서 명시적으로 허용된 읽기 전용 `promotion_member_progress_view`만 사용
- 관계 데이터는 명시된 외래키 ID를 기준으로 클라이언트 서비스 계층에서 조합
- 데이터가 없으면 각 화면의 빈 상태 UI 표시
- insert payload에는 identity `id`, 기본값이 있는 `created_at`, `updated_at`을 포함하지 않음
- 태그 선택지 자체는 `src/constants/tags.js`에만 있으며, 선택 결과 배열만 jsonb 컬럼에 저장

## Supabase 정책 확인

브라우저에서 anon key로 쓰기 때문에 해당 `team_matching_*` 테이블의 RLS 정책이 select/insert/update/delete 작업을 허용해야 합니다. 팀 생성 실패 시 생성된 팀을 되돌리는 보상 처리에는 `team_matching_teams` delete 권한도 필요합니다.

오픈채팅 링크는 일반 팀 목록 쿼리에서 제외하고, 팀장 또는 active 팀원임을 확인한 후 별도 조회합니다. 실제 데이터 접근도 보호하려면 Supabase RLS 및 컬럼 권한을 함께 설정해야 합니다.

지원자 승인처럼 여러 테이블을 순서대로 변경하는 흐름은 프론트엔드에서 실패 보상 처리를 적용했습니다. 동시 승인까지 완전한 원자성이 필요하면 추후 기존 테이블을 사용하는 Supabase Database Function(RPC)으로 승인 로직을 옮기는 것을 권장합니다.
