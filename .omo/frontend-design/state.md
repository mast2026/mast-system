# Frontend Design State

## Current Objective

2026-08-25: 모바일 공모전 목록을 마감 판단과 탐색이 빠른 썸네일형 디렉터리로 개선한다.

## Locked Decisions

- 사용자는 디자인 세부 판단과 구현을 위임했다.
- DB 스키마는 변경하지 않는다.
- 기본 정렬은 마감 임박순이며 7일/30일 필터와 최근 등록순을 제공한다.
- 공고 링크에서 대표 이미지를 지연 추출하고 실패하면 정보성 대체 비주얼을 사용한다.
- 기존 720px 앱 셸과 상단/하단 내비게이션은 유지한다.
- 상단은 장식적 요약 수치 없이 흰색·짙은 테두리의 단순한 안내 카드로 유지한다.
- 결과 수 문구는 제거하고 기간 필터와 정렬을 한 줄에 모은다. 필터 바는 스크롤을 따라오지 않는다.

## Source Inputs

- 현재 모바일 캡처: `/Users/kiminho/Downloads/스크린샷, 2026-08-25 오후 5.05.43.png`
- 현재 구현: `src/screens/ContestsScreen.jsx`, `src/services/contestScrapeService.js`, `src/styles.css`
- 디자인 계약: `DESIGN.md`

## Design Brief

주 사용자는 이동 중 휴대폰으로 공모전을 훑는 동아리원이다. 마감일과 제목을 가장 먼저 보고, 관심이 생기면 원문 또는 팀 모집으로 이동한다. 차분한 캠퍼스 보드 톤을 유지하면서 한 화면의 정보 밀도를 높이고 장식성 영웅 영역과 반복 메타를 줄인다.

## Inclusive Personas

- 한 손 모바일 사용자: 375px에서 필터와 카드 행동을 엄지로 조작한다.
- 확대 사용자: 200%에서 텍스트와 행동이 겹치지 않는다.
- 키보드 사용자: 필터에서 카드 링크까지 자연스러운 탭 순서를 사용한다.

## Adaptive Preferences

- `prefers-reduced-motion`을 존중한다.
- 한국어 긴 제목은 어절을 우선하고, 공간 부족 시 안전하게 줄바꿈한다.
- 최소 터치 영역 44px과 명시적 포커스 링을 사용한다.

## Verification Matrix

- `npm run lint`, `npm run build`, React 정적 진단.
- 375px, 768px, 1280px 실제 Chrome 캡처.
- 마감 정렬, 7일 필터, 빈 결과 복구, 외부 링크와 팀 모집 링크 확인.
- 독립 시각·접근성·휴리스틱 리뷰.

## Design Debt Register

- Legacy: `src/styles.css` 전체의 원시 색상/중복 규칙. 이번 변경은 새 공모전 범위만 토큰화한다.
- External: 일부 원문 사이트의 이미지 직링크 차단. 대체 비주얼로 기능을 보존한다.

## Evidence Index

- 구현 후 캡처와 검수 보고서 경로를 추가한다.
