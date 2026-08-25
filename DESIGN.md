# MAST Design System

## 1. Atmosphere & Identity

MAST는 동아리 운영 도구이지만 공지판처럼 딱딱하지 않고, 다음 행동을 빠르게 고를 수 있는 차분한 모바일 캠퍼스 보드처럼 느껴져야 한다. 시그니처는 하늘색 계열의 부드러운 면과 짙은 남색 정보 위계이며, 장식보다 일정과 행동을 먼저 보여준다.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Surface/base | `--surface-base` | `#f5f9fc` | 앱 배경 |
| Surface/card | `--surface-card` | `#ffffff` | 카드와 컨트롤 |
| Surface/soft | `--surface-soft` | `#edf6fb` | 보조 정보 면 |
| Surface/warm | `--surface-warm` | `#fff8dc` | 임박 정보와 포인트 면 |
| Text/primary | `--text-primary` | `#182b3a` | 제목과 핵심 정보 |
| Text/secondary | `--text-secondary` | `#607681` | 본문과 메타 정보 |
| Text/tertiary | `--text-tertiary` | `#82949d` | 힌트와 비활성 정보 |
| Border/default | `--border-default` | `#dfeaf0` | 카드와 컨트롤 경계 |
| Accent/primary | `--accent-primary` | `#1684bd` | 선택 상태와 링크 |
| Accent/strong | `--accent-strong` | `#0d6f9f` | 강조 CTA와 포커스 |
| Accent/soft | `--accent-soft` | `#dff3fc` | 선택된 칩 배경 |
| Status/success | `--status-success` | `#237a57` | 모집 중 상태 |
| Status/success-soft | `--status-success-soft` | `#e0f5eb` | 모집 중 상태 배경 |
| Status/urgent | `--status-urgent` | `#b4532a` | 마감 임박 |
| Status/urgent-soft | `--status-urgent-soft` | `#fff0e7` | 마감 임박 배경 |
| Focus | `--focus-ring` | `rgba(22,132,189,.26)` | 키보드 포커스 |
| Shadow/card | `--shadow-card` | `0 12px 32px rgba(45,82,103,.09)` | 카드 깊이 |

새 화면은 위 토큰만 사용한다. 기존 `src/styles.css`의 다수 원시 색상은 이전 화면의 누적 부채이며 이번 공모전 목록 범위에서는 확장하지 않는다.

## 3. Typography

| Level | Size | Weight | Line Height | Tracking | Usage |
|---|---:|---:|---:|---:|---|
| Display | 32px | 800 | 1.18 | -0.05em | 페이지 제목 |
| H2 | 22px | 800 | 1.3 | -0.035em | 구역 제목 |
| H3 | 18px | 800 | 1.35 | -0.025em | 카드 제목 |
| Body | 15px | 500 | 1.55 | 0 | 기본 본문 |
| Body/sm | 13px | 500 | 1.5 | 0 | 카드 메타 |
| Caption | 12px | 700 | 1.4 | 0 | 칩과 보조 레이블 |
| Overline | 11px | 800 | 1.3 | 0.08em | 영문 구역 레이블 |

- Primary: `Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- 숫자와 날짜에는 `font-variant-numeric: tabular-nums`를 적용한다.
- 카드 제목은 3줄, 기관명은 2줄을 상한으로 하되 전체 제목은 상세 화면에서 확인 가능해야 한다.

## 4. Spacing & Layout

Base unit은 4px이다.

| Token | Value | Usage |
|---|---:|---|
| `--space-1` | 4px | 아이콘과 텍스트 |
| `--space-2` | 8px | 인라인 그룹 |
| `--space-3` | 12px | 작은 컨트롤 |
| `--space-4` | 16px | 모바일 카드 패딩 |
| `--space-5` | 20px | 구역 내부 |
| `--space-6` | 24px | 넓은 카드 패딩 |
| `--space-8` | 32px | 큰 구역 간격 |

- 앱 본문 최대 폭은 기존 계약인 720px을 유지한다.
- 모바일 좌우 여백은 16px, 목록 간격은 12px이다.
- 375px에서는 카드가 한 열이며, 제목/정보 영역과 92px 썸네일이 나란히 놓인다.
- 768px 이상에서도 읽기 흐름을 위해 목록 한 열을 유지하고 썸네일을 132px까지 키운다.

## 5. Components

### Contest Filter Bar
- **Structure**: 필터 칩 그룹과 정렬 `select`를 한 줄에 배치한다. 별도 결과 수 표시는 두지 않는다.
- **Variants**: 전체, 7일 이내, 30일 이내 / 마감 임박순, 마감 여유순, 최근 등록순.
- **States**: 기본, 선택, hover, active, focus-visible, 빈 결과.
- **Accessibility**: `fieldset`/`legend`, 실제 `button`, 연결된 `label`과 `select`, 44px 터치 영역.
- **Layout**: 모든 화면에서 왼쪽부터 전체, 7일 이내, 30일 이내, 정렬 순의 한 행 cluster. 공간이 부족할 때만 해당 행 자체가 가로 스크롤된다.

### Contest Directory Card
- **Structure**: 상태·D-day, 제목·기관, 핵심 정보, 대표 이미지, 팀 모집/공고 링크.
- **Variants**: 모집 중, 마감 임박, 마감 프리뷰, 대표 이미지 없음.
- **States**: 기본, hover, active, focus-within, 이미지 로딩/성공/오류, 비활성 링크.
- **Accessibility**: 제목과 링크 이름이 목적을 설명하고, 썸네일 alt는 공모전명을 포함하며 대체 비주얼은 장식으로 처리한다.
- **Layout**: 카드 내부 sidebar primitive. 콘텐츠가 길어도 버튼은 카드 하단에 정렬한다.

### Contest Thumbnail
- **Structure**: 공모전 ID로 찾는 자체 호스팅 WebP 또는 공모전명 기반 대체 비주얼.
- **States**: 관찰 전, 로딩 skeleton, 이미지 표시, 오류 fallback.
- **Accessibility**: 실제 이미지는 `[공모전명] 공고 이미지`, 대체 비주얼은 `aria-hidden`.
- **Performance**: 목록은 360×480 WebP를 즉시 요청한다. 저장 파일이 없는 이전 공고만 화면 근처에서 원문 대표 이미지를 추출하며 세션 캐시를 사용한다.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---:|---|---|
| Micro | 140ms | ease-out | 누름, 칩 선택 |
| Standard | 220ms | ease-in-out | 카드/썸네일 상태 전환 |

- `transform`과 `opacity`만 움직인다.
- `prefers-reduced-motion: reduce`에서는 비필수 전환을 제거한다.
- 정렬과 필터 변경은 즉시 반영하고 결과 수를 같이 갱신해 상태 변화를 설명한다.

## 7. Depth & Surface

전략은 `mixed`이되 카드 한 단계만 사용한다. 기본 구분은 옅은 경계선, 공모전 카드만 `--shadow-card`로 배경에서 분리한다. 필터와 카드 내부 정보는 tonal shift를 사용하고 추가 그림자를 만들지 않는다.

## 8. Accessibility Constraints & Accepted Debt

### Constraints
- WCAG 2.2 AA, 본문 대비 4.5:1 이상, 큰 텍스트와 아이콘 3:1 이상을 목표로 한다.
- 모든 필터와 링크는 키보드로 도달 가능하고 `:focus-visible`이 보여야 한다.
- 터치 대상은 최소 44px, 375px과 200% 확대에서 수평 본문 스크롤이 없어야 한다.
- 빈 결과는 이유와 복구 행동을 한국어 평문으로 제공한다.
- 필터 선택을 색상만으로 표현하지 않고 텍스트와 형태를 함께 바꾼다.

### Inclusive personas
- 이동 중 한 손으로 보는 회원: 375px 화면에서 마감일, 제목, 공고 열기를 빠르게 구분한다.
- 낮은 시력 또는 확대 사용 회원: 200% 확대에서도 필터와 카드 행동이 겹치지 않는다.
- 키보드 사용자 운영진: 필터, 정렬, 팀 모집, 외부 공고를 논리적 순서로 이동한다.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| 기존 전역 CSS의 원시 색상과 중복 규칙 | `src/styles.css`의 기존 화면 | 전역 정리는 이번 공모전 목록 요청보다 범위가 크고 회귀 위험이 높음 | 다음 전역 디자인 시스템 정리 시 토큰화 |
| 원문에서 대표 이미지를 찾지 못할 수 있음 | 공모전 썸네일 생성 | 정보성 대체 비주얼을 항상 제공하고 관리자가 일괄 변환을 재시도할 수 있게 함 | 관리자 직접 이미지 업로드 도입 시 제거 |
