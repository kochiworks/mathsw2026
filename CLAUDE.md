# CLAUDE.md — 수학 SoftWare (2026 수학·과학 축제)

새 세션·새 계정에서 이어서 작업하기 위한 요약입니다. 사용자용 안내는 `README.md`를 보세요.

## 1. 프로그램이 하는 일
2026 수학·과학 축제 **‘수학 SoftWare’** 부스의 활동 안내 웹페이지(정적 사이트, GitHub Pages).
학생이 활동 카드를 고르면 상세 안내와 ‘활동 시작하기’ 버튼(외부 링크: Amplify, Desmos 등)·QR 코드로 참여한다.

- 공개 주소: https://kochiworks.github.io/mathsw2026/ (Pages: `main` / root)
- 저장소: `kochiworks/mathsw2026`

### 용어
| 용어 | 뜻 |
|---|---|
| 수리봇 | 안내 캐릭터(가을풍 로봇). 모든 페이지에서 말풍선으로 안내 (`assets/robot.webp`) |
| DB / DB 시트 | 활동 목록 원본 = `data/mathsw_db.xlsx` 의 `DB` 시트 |
| 활동 카드 | 활동 목록 페이지의 타일 1개 = DB 한 행 |
| 난이도 | DB의 숫자 → 화면에 ★★☆ 로 표시 (가장 큰 값만큼 칸, 최소 3칸) |
| 분류 | DB의 `분류` 값 → 목록 상단 필터 버튼 (현재: 기하도구·액티비티·AI) |

## 2. 실행·빌드·테스트
- 빌드 없음. 순수 HTML/CSS/JS. 패키지 매니저·테스트 코드 없음.
- 로컬 확인: `python3 -m http.server 8765` 후 http://localhost:8765/ (엑셀을 `fetch`하므로 `file://`로 열면 안 됨)
- 화면 검증은 Playwright(헤드리스 Chromium)로 스크린샷·DOM 확인을 해 왔다. 저장소에 테스트 스크립트는 없음.
- 배포: `main`에 push → GitHub Pages 자동 배포(1~2분).
- 외부 의존성(CDN): Google Fonts(Montserrat, Noto Sans KR), cdnjs `qrcodejs 1.0.0`(QR 코드). 그 외 라이브러리 없음.

## 3. 폴더·파일 구조
```
index.html          페이지 뼈대, 상단 메뉴, 장식용 SVG 심볼, 스크립트 로드(?v= 캐시 버전)
css/style.css       가을 축제 테마(색 토큰, 가랜드, 카드, 반응형)
js/config.js        사이트 설정: dataFile·sheetName, 문구, 목표, 참여 단계, activityIcons
js/xlsx-reader.js   의존성 없는 .xlsx 읽기(zip 해제는 브라우저 DecompressionStream) → window.readXlsxSheet
js/app.js           데이터 로딩, 머리글→용도 자동 매핑, 해시 라우터, 각 페이지 렌더링
data/mathsw_db.xlsx 활동 DB 원본 (이 파일을 바꾸면 사이트에 반영)
assets/robot.webp   수리봇(체크무늬 배경 제거한 투명 이미지), robot-icon.png(파비콘·로고)
assets/icons/       활동별 아이콘 이미지 (runway.png = ‘활주로를 찾아라’)
print/cover.*       활동지 소책자 A4 표지(html/pdf/png). 다른 세션에서 추가 (PR #2)
.nojekyll           Pages에서 Jekyll 처리 끔
```

### app.js 핵심
- 라우트: `#/` 홈, `#/intro` 소개, `#/activities` 목록(검색·분류 필터), `#/activity/N` 상세, `#/guide` 참여 방법.
- `FIELD_ALIASES`: 엑셀 머리글 이름으로 열 용도 판단(연번·활동·분류·난이도·링크 등. 전체 표는 README).
- 아이콘 우선순위: `이미지` 열 → `아이콘` 열의 이미지 경로 / `config.activityIcons`(활동명 포함, 공백 무시) → 이모지.
- 매핑되지 않은 열은 상세 페이지 ‘활동 정보’, URL 값은 ‘관련 링크’로 표시.

## 4. 확정된 설계 결정 (이유)
1. **데이터는 저장소의 엑셀 파일을 브라우저가 직접 읽는다.** 처음엔 게시된 구글 시트 CSV → 이후 엑셀 DB로 변경(데이터가 적고 자주 안 바뀜) → 변환 단계 없이 “GitHub에서 엑셀만 교체하면 반영”되도록 직접 읽기로 확정.
2. **엑셀 라이브러리(SheetJS) 대신 자체 리더.** npm의 `xlsx` 0.18.5는 알려진 보안 이슈가 있고 CDN도 불확실 → `xlsx-reader.js` 직접 작성(최신 브라우저 필요).
3. **수정은 `main`에 바로 반영.** 사용자가 “곧바로 main에 merge” 하도록 요청해 왔음. 작업 브랜치 `claude/elegant-curie-go8gxk`에 커밋 → `main`에 push.
4. **CSS/JS 수정 시 `index.html`의 `?v=` 값을 올린다.** Pages 캐시(약 10분) 때문에 이전 파일이 보이는 문제가 있었음. 엑셀은 `cache: "no-cache"`로 매번 확인하므로 버전 불필요.
5. **카드 배치: 한 줄 4개**(>1000px), 3개(≤1000), 2개(≤760), 1개(≤480).
6. 디자인: 첨부된 추수감사절 템플릿 참고 — 갈색·주황·머스터드·세이지·보라, 삼각 깃발/해바라기/나뭇잎, 갈색 라벨+주황 상자 카드.
7. 사용자에게 불필요한 기술 안내 문구는 넣지 않는다(푸터의 “구글 시트에서 불러옵니다” 문구 삭제 요청 있었음).

### 하면 안 되는 것
- 저장소는 **공개**: 엑셀·코드 어디에도 학생 이름 등 개인정보, 키·토큰을 넣지 말 것. (과거 엑셀에 ‘참가자 정보’ 시트가 있었으나 현재 파일에는 없음)
- 엑셀 파일명 `mathsw_db.xlsx`, 시트명 `DB`, 머리글을 바꾸지 말 것(바꾸면 `config.js`도 수정).
- 빌드 도구·프레임워크 도입 금지(교사가 GitHub 웹에서 파일만 바꿔 운영하는 구조).
- 다른 세션 작업물(`print/`)을 임의로 지우거나 덮어쓰지 말 것.

## 5. 현재 상황 (2026-11-01 기준)
- `main` = `claude/elegant-curie-go8gxk` = `f2e272e` (활동 DB 교체, 카드 4열).
- DB 활동 7개: 정다각형 만들기, 색상환 만들기, 스트링 아트 만들기, 활주로를 찾아라(일차함수), 삼각함수 위를 달리는 구슬, 이차곡선의 그래프, 행렬과 AI.
- DB 열은 `연번, 난이도, 활동, 분류, 링크`뿐 → 상세 페이지의 설명은 기본 문구(“수학 SoftWare 활동에 도전해 보세요!”)로 나옴.

### 알려진 문제·확인 필요
- QR 코드: cdnjs가 개발 환경에서 차단되어 실제 표시 여부 **확인 필요**(라이브러리 로드 실패 시 QR 영역은 숨김).
- 소개 페이지 문구·목표·참여 방법은 Claude가 작성한 기본값 → 사용자 검토 여부 **확인 필요**.
- 이전 Canva 페이지(quickcount.my.canva.site/2026math)는 개발 환경에서 접속이 막혀 참고하지 못했음.
- 개발 환경(클라우드)에서 docs.google.com, canva, github.io, CDN 접속이 차단됨 → 배포 사이트는 직접 확인 불가, 사용자 스크린샷으로 확인해 왔음.
- `app.js`에 구글 드라이브 이미지 링크 변환 등 구글 시트 시절 기능 일부가 남아 있음(동작에 문제 없음).

### 다음 할 일 (후보, 사용자 확정 아님 — 확인 필요)
- DB에 `설명`·`활동 방법` 열을 추가하면 상세 페이지가 풍부해짐.
- 실제 기기에서 QR 코드·휴대폰 화면 점검.
- 다른 활동에도 아이콘 이미지 추가(`assets/icons/` + `config.activityIcons`).
