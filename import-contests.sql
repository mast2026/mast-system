-- 공모전 사이트 모음.xlsx 일괄 등록 (23건)
-- Supabase SQL Editor에서 1회만 실행하세요. (중복 실행 시 같은 공모전이 두 번 등록됨)
insert into public.team_matching_contests
  (title, organizer, registration_deadline, link, max_team_size, is_active) values
  ('[한국정보통신진흥협회] 제26회 모바일 기술대상', '과학기술정보통신부', '2021-08-01', 'https://www.mta.co.kr/', 4, true),
  ('[한국동서발전] 제2회 풍력발전량 예측 AI 경진대회, BARAM 2026', '한국동서발전', '2014-08-01', 'https://dacon.io/competitions/official/236727/overview/description', 4, true),
  ('제 4회 인공지능(AI) 신약개발 경진대회(4th JUMP AI, fourth.py) 예선', '보건복지부/한국보건산업진흥원/고려대학교의과대학/한국제약바이오협회', '2026-08-07', 'https://daker.ai/public/hackathons/4th-jump-ai-agentic-drug-challenge', 4, true),
  ('2026년 제3회 서울특별시 환경교육 콘텐츠 공모전 개최 안내', '서울특별시환경교육센터', '2026-08-04', 'https://seec.or.kr/bbs/board.php?bo_table=notice&wr_id=264', 4, true),
  ('제 26회 대학(원)생 국제법 논문경시대회', '외교부, 대한국제법학회', '2026-08-01', 'https://ksil.or.kr/', 4, true),
  ('HUG UP 청년 예비창업가, 사회서비스 분야 모집', '주택도시보증공사', '2031-07-01', 'https://hugup-busan.com/', 4, true),
  ('제1회 자유기업원 AI콘텐츠 공모전 안내', '자유기업원', '2026-07-31', 'https://www.cfe.org/20260601_29097', 4, true),
  ('중장기 국가발전전략 공모전', '기획예산처', '2031-07-01', 'https://mpbvisionidea.kr/', 4, true),
  ('2026 국가안보 논문 및 아이디어 공모전', '국가정보원', '2031-07-01', 'https://www.xn--o39a5rgl805b7vcqzrdue.com/', 4, true),
  ('2026 기업이미지 공모전', '한국수력원자력', '2026-07-30', 'https://www.khnp.co.kr/main/selectWebEventManageView.do?key=382&ntcobSeq=283&pageUnit=9&searchCnd=all&searchKrwd=&pageIndex=1', 4, true),
  ('제3회 KRC AI 디지털 혁신 공모전', '한국농어촌공사', '2031-07-01', 'https://inthiswork.com/archives/364777', 4, true),
  ('2026 CHAI 대학생 AI 광고 공모전', '차이커뮤니케이션', '2030-07-01', 'https://artistchai.co.kr/inc/popup/pop.html?idx=22', 4, true),
  ('한솔그룹 AI숏폼 공모전', '한솔그룹', '2026-08-02', 'https://www.aicontesthansol.com/', 4, true),
  ('[KB국민은행] 제8회 FUTURE FINANCE A.I. CHALLENGE', '국민은행', '2026-08-03', 'https://kb-aichallenge.com/', 4, true),
  ('2026 디스플레이 챌린지 공모전', '한국디스플레이산업협회', '2026-08-31', 'https://www.kdia.org/index_kr.jsp', 4, true),
  ('2026년 보훈 공공데이터·AI 활용 아이디어 공모전', '국가보훈부, 독립기념관, 보훈복지의료공단', '2026-08-31', 'https://linkareer.com/activity/332857', 4, true),
  ('2026 AI 도시지역혁신 아이디어 공모전', '2026 도시·지역혁신 산업박람회', '2026-08-28', 'http://kcriexpo.kr/', 4, true),
  ('제2회 AI 활용 콘텐츠 공모전', '한국수목원정원관리원', '2026-07-31', 'https://www.koagi.or.kr/www/intro.do', 4, true),
  ('2026년 연구실 안전 콘텐츠 및 우수사례 공모전', '과학기술정보통신부/한국생명공학연구원 국가연구안전관리본부', '2026-07-31', 'https://www.contestkorea.com/sub/view.php?int_gbn=1&Txt_bcode=030310001&str_no=202606090018', 4, true),
  ('2026 AI·디지털 논문공모전', '과학기술정보통신부', '2026-09-25', 'https://digitalsociety.or.kr/pages/2026paper-contest', 4, true),
  ('제24회 임베디드SW경진대회', '산업통상부', '2026-09-03', 'https://www.eswcontest.or.kr/main.php', 4, true),
  ('2026년 국민체육진흥공단 공공데이터 활용 경진대회', '국민체육진흥공단', '2026-10-02', 'https://www.campuz.net/contest/496743', 4, true),
  ('전국민 AI활용 사례 공모전 시즌 2', '과학기술정보통신부', '2026-08-31', 'https://aichallenge4all.or.kr/competitions/case-contest', 4, true);
