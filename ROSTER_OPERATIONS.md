# 최신 명단 및 제외 회원 보관

앱은 `team_matching_members.roster_status = active`를 현재 회원 명단으로 사용한다. 홍보 명단은 `members.status = active`를 사용한다. 회원번호(`roster_number`)는 기존 DB ID와 별개이며 기존 ID·비밀번호·팀과 출석 이력을 유지한다.

제외 계정의 원본은 `mast_member_archive`에 저장한다. 외래키로 연결된 이력을 지우지 않기 위해 기존 행은 비활성 상태로 유지한다. 관리자 로그인용 시스템 행은 `system`으로 구분하며 회원 명단과 집계에서 제외한다.

전화번호·인스타·직함·임원진 여부·비고는 최신 명단을 기준으로 저장한다. 직함 등록 자체가 관리자 권한 부여를 의미하지 않는다. 원본 CSV 데이터와 통계는 `mast_roster_imports`에 기록하며 이 두 보관 테이블은 일반 클라이언트에서 조회할 수 없다. 원본 개인정보와 운영 DB 백업은 Git에 커밋하지 않는다.

새 DB 구성 시 기존 비밀번호 재설정 SQL을 먼저 적용하고 `supabase/member-roster-archive.sql`을 마지막으로 적용한다. 이 마이그레이션은 제외 계정의 재설정 요청·기존 토큰 사용도 차단한다. 이후 회원 원본 CSV는 이름·기수 및 확인 가능한 식별정보로 대조한 뒤 별도 트랜잭션에서 반영해야 한다.

검증은 기존 `npm test`, `npm run build`와 다음 롤백 SQL 테스트로 수행한다: `supabase/member-password-reset.test.sql`, `supabase/member-password-self-reset.test.sql`, `supabase/member-roster-archive.test.sql`.

현재 앱의 전체 인증/권한 보안은 미완료다. 보관 테이블 접근 차단과 제외 회원 숨김이 전체 데이터 보호를 의미하지 않는다. anon 역할의 기존 prototype 권한과 클라이언트 비밀번호 검증을 서버 인증 및 사용자별 접근 제한으로 교체해야 한다.
