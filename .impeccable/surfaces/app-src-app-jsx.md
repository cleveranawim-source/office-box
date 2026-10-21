---
version: 1
slug: "app-src-app-jsx"
primary_target: "app/src/App.jsx"
related_targets: []
---

# Surface: 교무자동화도구 박스 웹앱 (app shell + 4 tools)

Mode: Operate. Users: 교무·교육과정 담당 교사, 교무실 데스크톱 모니터, 형광등 아래 낮 시간 → light ground.
Job: 첫 화면에서 도구를 골라 들어가고, 시트를 넣어 결과를 고치고 엑셀로 내보낸다. 도구끼리 데이터가 이어진다(01 학사일정 → 02 시수·03 범교과).
Constraints: 정적 GitHub Pages, 브라우저 저장만, 키보드 접근, 색만으로 상태 구분 금지.

## Direction contract

THESIS: 모든 일정·시수·편성을 교실 시간표처럼 요일 칸과 교시 칸으로 읽게 한다. 회색 SaaS 사이드바+카드 격자를 거부한다.

OWN-WORLD: 부직포 게시판 초록 레일(#1F4D3A)과 흰 판(#FAFAF7/#FFF), 먹색 2px 칸 테두리. 도구마다 과목 색지(01 보라 #6D3FC0, 02 파랑 #2563C9, 03 초록 #1E7F3A, 04 노랑 #F2A900)는 칸 머리띠와 데이터에만. 붉은 주서 #C8102E는 ‘사람이 정할 것’에만(점선). 공휴일은 초록 빗금. Pretendard, 숫자는 tabular.

STORY: 선생님은 네 도구가 시간표 칸처럼 붙은 판을 보고, 올해 데이터가 어디까지 왔는지 알고, 한 칸을 눌러 이어서 일한다.

FIRST VIEWPORT: 왼쪽 232px 초록 레일(이름, 작업 학년도, 도구 01~04 색 탭, 저장 상태, 떨어진 ‘데이터 지우기’). 오른쪽 흰 판에 제목 “무엇을 할까요?”와 먹색 테두리 4열 시간표: 열마다 색 머리띠(번호·도구명·데이터 요약), 설명, 입력/결과 상태, 점선 주서 ‘확인 필요 n건’, 7칸 교시 막대, 하단 주 버튼.

FORM: 교실 시간표판 — grounded list 5/7 (assigned). seed:b78895eacb5446a1. Signature move: 7칸 교시 막대 — 행사·손실·편성이 차지하는 교시를 칸으로 채워 보여 주고, 모든 도구에서 같은 막대를 쓴다. Raises: 선 모양 상태(실선 확정·점선 확인·취소선 제외), 주서 한 색, 칸 격자 뼈대, 되돌릴 수 없는 버튼 격리.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
