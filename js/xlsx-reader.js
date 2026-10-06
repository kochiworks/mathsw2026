/* 작은 엑셀(.xlsx) 읽기 도구
 * 외부 라이브러리 없이 브라우저 내장 압축 해제(DecompressionStream)로
 * 지정한 시트의 값을 [[셀, 셀, ...], ...] 형태의 문자열 표로 돌려줍니다.
 * (수식 셀은 엑셀에 저장된 계산 결과 값을 사용합니다.)
 */
(function () {
  "use strict";

  // ---------- zip 해제 ----------
  function listZip(buf) {
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("엑셀(xlsx) 파일 형식이 아니에요.");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    const files = {};
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const size = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      files[name] = { method, data: new Uint8Array(buf, start, size) };
      p += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  }

  async function readText(files, name) {
    const f = files[name];
    if (!f) return null;
    let bytes = f.data;
    if (f.method === 8) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (f.method !== 0) {
      throw new Error("지원하지 않는 압축 방식이에요.");
    }
    return new TextDecoder().decode(bytes);
  }

  const xml = (text) => new DOMParser().parseFromString(text, "application/xml");
  const tags = (node, name) => Array.from(node.getElementsByTagNameNS("*", name));

  // 서식이 섞인 글자(<r><t>)는 이어 붙이고, 일본어 후리가나(<rPh>)는 제외
  function cellText(node) {
    return tags(node, "t").filter((t) => !t.closest("rPh")).map((t) => t.textContent).join("");
  }

  function colIndex(ref) {
    let n = 0;
    for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  // ---------- 시트 읽기 ----------
  async function readXlsxSheet(buf, sheetName) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("이 브라우저는 너무 오래되어 엑셀 파일을 읽을 수 없어요. 최신 브라우저를 사용해 주세요.");
    }
    const files = listZip(buf);
    const wb = xml(await readText(files, "xl/workbook.xml"));
    const sheets = tags(wb, "sheet");
    const sheet = sheets.find((s) => s.getAttribute("name") === sheetName) || sheets[0];
    if (!sheet) throw new Error("엑셀 파일에 시트가 없어요.");

    // 시트 이름 → 실제 xml 파일 경로
    const rid = sheet.getAttribute("r:id") ||
      sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rels = xml(await readText(files, "xl/_rels/workbook.xml.rels"));
    const rel = tags(rels, "Relationship").find((r) => r.getAttribute("Id") === rid);
    let target = rel ? rel.getAttribute("Target") : "worksheets/sheet1.xml";
    target = target.startsWith("/") ? target.slice(1) : "xl/" + target;

    const sstText = await readText(files, "xl/sharedStrings.xml");
    const shared = sstText ? tags(xml(sstText), "si").map(cellText) : [];

    const ws = xml(await readText(files, target));
    const rows = [];
    tags(ws, "row").forEach((row) => {
      const out = [];
      tags(row, "c").forEach((c, i) => {
        const ref = c.getAttribute("r");
        const col = ref ? colIndex(ref) : i;
        const type = c.getAttribute("t");
        const v = tags(c, "v")[0];
        let val = "";
        if (type === "s") val = v ? shared[+v.textContent] || "" : "";
        else if (type === "inlineStr") val = cellText(c);
        else if (type === "b") val = v && v.textContent === "1" ? "TRUE" : "FALSE";
        else if (type === "str" || type === "e") val = v ? v.textContent : "";
        else val = v && v.textContent !== "" && !isNaN(v.textContent) ? String(Number(v.textContent)) : ""; // 10.0 → 10
        while (out.length < col) out.push("");
        out[col] = val;
      });
      rows.push(out);
    });
    return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
  }

  window.readXlsxSheet = readXlsxSheet;
})();
