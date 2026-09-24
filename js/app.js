/* 수학 SoftWare · 2026 수학·과학 축제
 * 게시된 구글 시트(CSV)를 읽어 활동 페이지를 만듭니다.
 * 시트의 첫 줄(머리글) 이름을 보고 각 열의 용도를 자동으로 판단합니다.
 */
(function () {
  "use strict";

  const CFG = window.MATHSW_CONFIG || {};
  const app = document.getElementById("app");
  const ROBOT = "assets/robot.webp";

  // ---------- 머리글 → 용도 매핑 ----------
  const FIELD_ALIASES = {
    num:      ["번호", "순번", "no", "no.", "#", "순서", "id"],
    title:    ["활동명", "활동 이름", "활동이름", "활동", "제목", "프로그램", "프로그램명", "콘텐츠", "이름", "부스명", "title", "name"],
    desc:     ["설명", "활동 설명", "활동설명", "내용", "소개", "활동 내용", "활동내용", "개요", "description", "desc"],
    how:      ["방법", "활동 방법", "활동방법", "진행 방법", "진행방법", "참여 방법", "참여방법", "사용법", "how"],
    say:      ["안내", "안내 멘트", "안내멘트", "캐릭터", "캐릭터 대사", "대사", "멘트", "한마디", "tip", "팁"],
    link:     ["링크", "url", "주소", "바로가기", "활동 링크", "활동링크", "사이트", "link", "href"],
    image:    ["이미지", "썸네일", "사진", "그림", "image", "img", "thumbnail"],
    category: ["분류", "구분", "카테고리", "영역", "유형", "종류", "주제", "category", "type"],
    target:   ["대상", "학년", "대상 학년", "난이도", "level", "grade"],
    icon:     ["아이콘", "이모지", "icon", "emoji"],
    visible:  ["공개", "표시", "사용", "노출", "게시", "visible", "show"],
  };
  const HIDDEN_VALUES = ["n", "no", "x", "false", "0", "비공개", "숨김", "아니오", "미사용"];
  const EMOJIS = ["🧮", "📐", "🔢", "📊", "🎲", "🧩", "🤖", "📈", "🔺", "➗"];

  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const isUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || "").trim());
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  // ---------- CSV 파서 (따옴표·줄바꿈 지원) ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    text = text.replace(/^﻿/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
        } else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ""));
  }

  // 구글 드라이브 공유 링크를 이미지 주소로 변환
  function imageUrl(u) {
    u = String(u || "").trim();
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
    return m ? "https://lh3.googleusercontent.com/d/" + m[1] : u;
  }

  function mapHeaders(headers) {
    const map = {};
    const used = new Set();
    const hs = headers.map(norm);
    // 1) 정확히 일치  2) 머리글에 별칭이 포함
    for (const pass of [0, 1]) {
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (map[field] != null) continue;
        const idx = hs.findIndex((h, i) => !used.has(i) && h &&
          aliases.some((a) => (pass === 0 ? h === a : h.includes(a) && a.length > 1)));
        if (idx >= 0) { map[field] = idx; used.add(idx); }
      }
    }
    return map;
  }

  function buildActivities(rows) {
    if (!rows.length) return { headers: [], items: [] };
    const headers = rows[0].map((h) => h.trim());
    const map = mapHeaders(headers);
    const body = rows.slice(1);

    // 제목 열을 못 찾으면 URL이 아닌 첫 번째 열 사용
    if (map.title == null) {
      const taken = new Set(Object.values(map));
      const idx = headers.findIndex((_, i) => !taken.has(i) && body.some((r) => r[i] && !isUrl(r[i])));
      if (idx >= 0) map.title = idx;
    }
    // 링크 열을 못 찾으면 값이 URL인 열 사용 (이미지 열 제외)
    if (map.link == null) {
      const idx = headers.findIndex((_, i) => i !== map.image && body.some((r) => isUrl(r[i])));
      if (idx >= 0) map.link = idx;
    }

    const known = new Set(Object.values(map));
    const items = [];
    body.forEach((r, n) => {
      const get = (f) => (map[f] != null ? (r[map[f]] || "").trim() : "");
      if (map.visible != null && HIDDEN_VALUES.includes(norm(get("visible")))) return;
      const title = get("title");
      if (!title) return;
      const extra = [];
      const extraLinks = [];
      headers.forEach((h, i) => {
        if (known.has(i)) return;
        const v = (r[i] || "").trim();
        if (!v) return;
        if (isUrl(v)) extraLinks.push({ label: h || "링크", url: v });
        else extra.push({ label: h || "항목 " + (i + 1), value: v });
      });
      const link = get("link");
      items.push({
        id: items.length + 1,
        num: get("num") || String(items.length + 1),
        title,
        desc: get("desc"),
        how: get("how"),
        say: get("say"),
        link: isUrl(link) ? link : "",
        linkText: !isUrl(link) ? link : "",
        image: isUrl(get("image")) ? imageUrl(get("image")) : "",
        category: get("category"),
        target: get("target"),
        icon: get("icon"),
        extra,
        extraLinks,
        row: n + 2,
      });
    });

    // 번호 열이 숫자라면 번호 순으로 정렬
    if (map.num != null && items.every((it) => !isNaN(parseFloat(it.num)))) {
      items.sort((a, b) => parseFloat(a.num) - parseFloat(b.num));
      items.forEach((it, i) => (it.id = i + 1));
    }
    return { headers, map, items };
  }

  // ---------- 데이터 로딩 ----------
  const state = { status: "idle", items: [], error: "", loadedAt: null, filter: "전체", query: "" };
  let loading = null;

  function loadSheet(force) {
    if (loading && !force) return loading;
    state.status = "loading";
    loading = fetch(CFG.sheetCsvUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then((text) => {
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("CSV가 아닌 응답을 받았어요. 시트가 ‘웹에 게시(CSV)’되어 있는지 확인해 주세요.");
        const data = buildActivities(parseCSV(text));
        state.items = data.items;
        state.status = "ready";
        state.loadedAt = new Date();
      })
      .catch((err) => {
        state.status = "error";
        state.error = err.message || String(err);
      })
      .finally(() => route());
    return loading;
  }

  // ---------- 공통 조각 ----------
  function bunting(n) {
    const kinds = ["sage", "dots", "stripe", "plaid", "spots", "red"];
    let html = "";
    for (let i = 0; i < n; i++) html += `<span class="flag ${kinds[i % kinds.length]}"></span>`;
    return `<div class="bunting" aria-hidden="true">${html}</div>`;
  }

  function guide(text, side) {
    return `<div class="guide ${side === "right" ? "right" : ""}">
      <img src="${ROBOT}" alt="안내 캐릭터 ${esc(CFG.guideName || "")}" />
      <div class="bubble"><b class="name">${esc(CFG.guideName || "수리봇")}</b><p data-type="${esc(text)}"></p></div>
    </div>`;
  }

  // 말풍선 글자를 한 글자씩 보여주기
  function typeBubbles() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    app.querySelectorAll("[data-type]").forEach((el) => {
      const full = el.getAttribute("data-type");
      if (reduce) { el.textContent = full; return; }
      let i = 0;
      el.classList.add("typing");
      const tick = () => {
        i += 2;
        el.textContent = full.slice(0, i);
        if (i < full.length && el.isConnected) setTimeout(tick, 28);
        else el.classList.remove("typing");
      };
      tick();
    });
  }

  function statusBlock() {
    if (state.status === "error") {
      return `${guide("앗! 활동 정보를 불러오지 못했어요.\n인터넷 연결을 확인하고 다시 시도해 볼까요?")}
        <div class="state"><p>오류: ${esc(state.error)}</p>
        <button class="btn" data-action="reload">다시 불러오기</button></div>`;
    }
    return `<div class="state"><div class="loader"><i></i><i></i><i></i></div><p>구글 시트에서 활동을 불러오는 중…</p></div>`;
  }

  function updatedLine() {
    if (!state.loadedAt) return "";
    const t = state.loadedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return `<p class="updated">${t} 기준 정보 · <button data-action="reload">새로고침</button></p>`;
  }

  function patternClass(i) { return "pat-" + (i % 5); }
  function emojiFor(it) { return it.icon || EMOJIS[(it.id - 1) % EMOJIS.length]; }

  // ---------- 페이지 ----------
  function pageHome() {
    const count = state.status === "ready" ? state.items.length : "…";
    const cats = state.status === "ready" ? new Set(state.items.map((i) => i.category).filter(Boolean)).size : 0;
    return `<section class="hero">
      ${bunting(14)}
      <div class="deco" style="left:-60px;top:40px;width:200px;height:200px;color:var(--sage)"><svg><use href="#oval-leaf"/></svg></div>
      <div class="deco" style="left:-40px;bottom:-40px;width:180px;height:180px"><svg><use href="#sunflower"/></svg></div>
      <div class="deco" style="left:90px;bottom:-50px;width:120px;height:120px;color:var(--orange);transform:rotate(30deg)"><svg><use href="#leaf"/></svg></div>
      <div class="deco" style="right:-50px;top:60px;width:170px;height:170px"><svg><use href="#sunflower"/></svg></div>
      <div class="deco" style="right:-30px;bottom:-30px;width:170px;height:170px;color:var(--mustard);transform:rotate(-30deg)"><svg><use href="#leaf"/></svg></div>
      <div class="deco" style="right:120px;bottom:-60px;width:120px;height:120px;color:var(--sage);transform:rotate(20deg)"><svg><use href="#oval-leaf"/></svg></div>
      <span class="hero-festival">${esc(CFG.festival)}</span>
      <h1>수학 <span>SoftWare</span></h1>
      <p class="lead">${esc(CFG.subtitle)}</p>
      <div class="cta">
        <a class="btn big" href="#/activities">활동 시작하기 →</a>
        <a class="btn big ghost" href="#/guide">참여 방법 보기</a>
      </div>
      ${guide(`안녕하세요! 저는 ${CFG.guideName || "수리봇"}이에요.\n${CFG.festival} ‘수학 SoftWare’ 활동을 안내해 드릴게요. 준비됐나요?`)}
      <div class="stats">
        <div class="stat"><b>${count}</b><span>준비된 활동</span></div>
        ${cats > 1 ? `<div class="stat"><b>${cats}</b><span>활동 분야</span></div>` : ""}
        <div class="stat"><b>2026</b><span>수학·과학 축제</span></div>
      </div>
    </section>`;
  }

  function pageIntro() {
    const goals = (CFG.goals || []).map((g, i) => `<div class="goal"><span class="dot">${i + 1}</span><p>${esc(g)}</p></div>`).join("");
    return `<section class="page">
      <h1 class="page-title">INTRODUCTION</h1>
      <p class="page-sub">수학 SoftWare 소개</p>
      ${guide("‘수학 SoftWare’는 수학 원리를 소프트웨어로 체험하는 활동이에요.\n컴퓨터나 스마트폰으로 직접 해 보면서 수학을 즐겨 봐요!", "right")}
      <div class="slide-card">
        <div class="label">수학 SoftWare 란?</div>
        <div class="box"><p>${esc(CFG.festival)}에서 만나는 수학 소프트웨어 체험 부스!</p>
        <p>숫자·도형·확률·데이터를 코딩과 앱으로 탐구하며,\n놀이처럼 수학적 사고력을 키워요.</p></div>
      </div>
      <h2 class="page-title" style="font-size:clamp(1.5rem,4vw,2.2rem);margin-top:44px">OUR GOALS</h2>
      <div class="goals">${goals}</div>
      <div style="text-align:center;margin-top:34px"><a class="btn big" href="#/activities">활동 목록 보러 가기 →</a></div>
    </section>`;
  }

  function filtered() {
    const q = norm(state.query);
    return state.items.filter((it) =>
      (state.filter === "전체" || it.category === state.filter) &&
      (!q || norm([it.title, it.desc, it.category, it.target].join(" ")).includes(q)));
  }

  function cardsHtml(list) {
    if (!list.length) return `<div class="state"><p>조건에 맞는 활동이 없어요.</p></div>`;
    return list.map((it) => `<a class="card" href="#/activity/${it.id}">
      <div class="thumb ${patternClass(it.id - 1)}">
        <span class="num">${esc(it.num)}</span>
        ${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" onerror="this.remove()" />` : `<span class="emoji">${esc(emojiFor(it))}</span>`}
      </div>
      <div class="body">
        <div class="tags">${it.category ? `<span class="tag">${esc(it.category)}</span>` : ""}${it.target ? `<span class="tag" style="background:#fdebd8;color:var(--orange)">${esc(it.target)}</span>` : ""}</div>
        <h3>${esc(it.title)}</h3>
        ${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ""}
        <span class="more">자세히 보기 →</span>
      </div>
    </a>`).join("");
  }

  function pageActivities() {
    let inner;
    if (state.status !== "ready") inner = statusBlock();
    else if (!state.items.length) inner = `<div class="state"><p>아직 시트에 등록된 활동이 없어요.</p></div>`;
    else {
      const cats = ["전체", ...new Set(state.items.map((i) => i.category).filter(Boolean))];
      inner = `<div class="toolbar">
          <label class="search">🔍<input type="search" id="q" placeholder="활동 이름으로 찾기" value="${esc(state.query)}" aria-label="활동 검색" /></label>
          ${cats.length > 2 ? `<div class="chips">${cats.map((c) => `<button class="chip ${c === state.filter ? "active" : ""}" data-filter="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
        </div>
        <div class="grid" id="grid">${cardsHtml(filtered())}</div>${updatedLine()}`;
    }
    const n = state.status === "ready" ? state.items.length : 0;
    return `<section class="page">
      <h1 class="page-title">ACTIVITIES</h1>
      <p class="page-sub">수학 SoftWare 활동 목록</p>
      ${guide(n ? `모두 ${n}개의 활동이 준비되어 있어요!\n마음에 드는 카드를 눌러 자세한 안내를 확인해 보세요.` : "어떤 활동이 있는지 함께 살펴볼까요?")}
      ${inner}
    </section>`;
  }

  function pageDetail(id) {
    if (state.status !== "ready") return `<section class="page">${statusBlock()}</section>`;
    const it = state.items.find((x) => x.id === id);
    if (!it) return `<section class="page">${guide("찾는 활동이 없어요. 목록에서 다시 골라 볼까요?")}<div class="state"><a class="btn" href="#/activities">활동 목록으로</a></div></section>`;
    const prev = state.items.find((x) => x.id === id - 1);
    const next = state.items.find((x) => x.id === id + 1);
    const say = it.say || (it.link
      ? `‘${it.title}’ 활동이에요!\n설명을 읽고 오른쪽의 ‘활동 시작하기’ 버튼을 누르거나 QR 코드를 찍어 참여해 보세요.`
      : `‘${it.title}’ 활동이에요!\n아래 설명을 잘 읽고 도전해 보세요.`);
    const info = [];
    if (it.category) info.push(["분류", it.category]);
    if (it.target) info.push(["대상", it.target]);
    it.extra.forEach((e) => info.push([e.label, e.value]));
    if (it.linkText) info.push(["안내", it.linkText]);

    return `<section class="page">
      <p class="page-sub" style="margin-bottom:0"><a href="#/activities">← 활동 목록</a></p>
      <div class="slide-card" style="max-width:none;margin-top:36px">
        <div class="label">${esc(it.num)}. ${esc(it.title)}</div>
        <div class="box"><p>${esc(it.desc || "수학 SoftWare 활동에 도전해 보세요!")}</p></div>
      </div>
      ${guide(say, "right")}
      <div class="detail">
        <div>
          ${it.image ? `<div class="panel"><img class="hero-img" src="${esc(it.image)}" alt="${esc(it.title)} 이미지" onerror="this.closest('.panel').remove()" /></div>` : ""}
          ${it.how ? `<div class="panel"><h2>활동 방법</h2><p class="text">${esc(it.how)}</p></div>` : ""}
          ${info.length ? `<div class="panel"><h2>활동 정보</h2><ul class="info-list">${info.map(([k, v]) => `<li><b>${esc(k)}</b><span>${esc(v)}</span></li>`).join("")}</ul></div>` : ""}
          ${!it.how && !info.length && !it.image ? `<div class="panel"><h2>활동 안내</h2><p class="text">${esc(it.desc || "활동 링크로 이동해 참여해 보세요.")}</p></div>` : ""}
        </div>
        <aside class="side">
          <div class="panel launch">
            <h2>바로 참여하기</h2>
            ${it.link
              ? `<a class="btn big" href="${esc(it.link)}" target="_blank" rel="noopener">활동 시작하기 ↗</a>
                 <div class="qr"><div id="qr"></div><small>휴대폰으로 QR 코드를 찍어도 돼요</small></div>`
              : `<p class="muted">이 활동은 현장에서 안내에 따라 진행해요.</p>`}
          </div>
          ${it.extraLinks.length ? `<div class="panel"><h2>관련 링크</h2><div class="links">${it.extraLinks.map((l) => `<a class="btn ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div></div>` : ""}
        </aside>
      </div>
      <div class="pager">
        ${prev ? `<a class="btn ghost" href="#/activity/${prev.id}">← ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a class="btn brown" href="#/activity/${next.id}">${esc(next.title)} →</a>` : `<a class="btn sage" href="#/activities">목록으로 돌아가기</a>`}
      </div>
    </section>`;
  }

  function pageGuide() {
    const steps = (CFG.steps || []).map((s) => `<div class="step"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join("");
    return `<section class="page">
      <h1 class="page-title">HOW TO JOIN</h1>
      <p class="page-sub">참여 방법</p>
      ${guide("참여 방법은 아주 간단해요!\n아래 순서대로 따라오면 누구나 수학 SoftWare 활동을 즐길 수 있어요.")}
      <div class="steps">${steps}</div>
      <div class="slide-card" style="margin-top:50px">
        <div class="label">TIP</div>
        <div class="box"><p>친구와 함께 도전하면 더 재미있어요!\n모르는 부분은 부스 선생님께 언제든지 물어보세요.</p></div>
      </div>
      <div style="text-align:center;margin-top:34px"><a class="btn big" href="#/activities">지금 도전하기 →</a></div>
    </section>`;
  }

  // ---------- 라우터 ----------
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [name, arg] = hash.split("/");
    let html, key = name || "home";
    if (key === "intro") html = pageIntro();
    else if (key === "activities") html = pageActivities();
    else if (key === "activity") { html = pageDetail(parseInt(arg, 10)); key = "activities"; }
    else if (key === "guide") html = pageGuide();
    else { html = pageHome(); key = "home"; }

    app.innerHTML = html;
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === key));
    typeBubbles();
    afterRender();
  }

  function afterRender() {
    const qr = document.getElementById("qr");
    const link = app.querySelector(".launch a.btn");
    if (qr && link && window.QRCode) {
      new window.QRCode(qr, { text: link.href, width: 340, height: 340, colorDark: "#5a3319", colorLight: "#fffaf0" });
    } else if (qr) {
      qr.parentElement.remove(); // QR 라이브러리를 불러오지 못한 경우
    }
    const q = document.getElementById("q");
    if (q) q.addEventListener("input", () => {
      state.query = q.value;
      document.getElementById("grid").innerHTML = cardsHtml(filtered());
    });
  }

  app.addEventListener("click", (e) => {
    const f = e.target.closest("[data-filter]");
    if (f) {
      state.filter = f.dataset.filter;
      app.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === f));
      document.getElementById("grid").innerHTML = cardsHtml(filtered());
    }
    if (e.target.closest('[data-action="reload"]')) loadSheet(true);
  });

  const menuBtn = document.querySelector(".menu-btn");
  const nav = document.getElementById("nav");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  let lastPage = location.hash.split("/")[1] || "";
  window.addEventListener("hashchange", () => {
    nav.classList.remove("open");
    const page = location.hash.split("/")[1] || "";
    route();
    // 페이지가 바뀌면 맨 위로 (같은 목록 내 필터 변경은 제외)
    if (page !== lastPage || page === "activity") window.scrollTo({ top: 0 });
    lastPage = page;
  });

  document.getElementById("brand-festival").textContent = CFG.festival || "";
  document.getElementById("footer-festival").textContent = CFG.festival || "";
  document.querySelector(".footer .bunting").innerHTML = bunting(10).replace(/^<div[^>]*>|<\/div>$/g, "");

  route();
  loadSheet();
})();
