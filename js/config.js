/*
 * 사이트 설정 파일
 * - 구글 시트 주소나 안내 문구를 바꾸고 싶으면 이 파일만 수정하면 됩니다.
 */
window.MATHSW_CONFIG = {
  // 웹에 게시된 구글 시트(CSV) 주소
  sheetCsvUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWu9LsFwIFIZbata39-0M-ZZT1PlYvndYAmtfrm8XlbSr3xtDzhRgTKlM6HSeOyvRJJagV8JIkHTs2/pub?gid=0&single=true&output=csv",

  festival: "2026 수학·과학 축제",
  title: "수학 SoftWare",
  subtitle: "수학으로 생각하고, 소프트웨어로 놀아요!",

  // 안내 캐릭터
  guideName: "수리봇",

  // 소개 페이지에 표시할 목표 (3개 권장)
  goals: [
    "수학 개념을 소프트웨어로 직접 체험해요",
    "놀이처럼 즐기며 수학적 사고력을 키워요",
    "친구와 함께 도전하고 결과를 나눠요",
  ],

  // 참여 방법 페이지 단계
  steps: [
    { title: "활동 고르기", text: "‘활동 목록’에서 해 보고 싶은 수학 SW 활동을 골라요." },
    { title: "안내 읽기", text: "수리봇의 설명과 활동 방법을 꼼꼼히 읽어요." },
    { title: "활동 시작", text: "‘활동 시작하기’ 버튼을 누르거나 QR 코드를 찍어 참여해요." },
    { title: "도전 완료!", text: "활동을 마치면 다른 활동에도 도전해 보세요." },
  ],
};
