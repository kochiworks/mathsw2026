"""엑셀 DB 파일의 'DB' 시트를 js/data.js 로 변환합니다.

사용법:  python tools/xlsx_to_data.py "엑셀파일.xlsx"
(필요 패키지: pip install openpyxl)

'참가자 정보' 등 다른 시트는 개인정보 보호를 위해 읽지 않습니다.
"""
import json
import sys
from pathlib import Path

import openpyxl

SHEET = "DB"
OUT = Path(__file__).resolve().parent.parent / "js" / "data.js"


def clean(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v.strip() if isinstance(v, str) else v


def main(path):
    ws = openpyxl.load_workbook(path, data_only=True)[SHEET]
    rows = [r for r in ws.iter_rows(values_only=True) if any(v not in (None, "") for v in r)]
    headers = [str(h).strip() for h in rows[0] if h not in (None, "")]
    items = []
    for n, r in enumerate(rows[1:], start=1):
        item = {h: clean(v) for h, v in zip(headers, r)}
        # 수식(=ROW()…)의 계산값이 저장되지 않은 경우 행 순서로 연번을 채움
        if "연번" in item and item["연번"] in ("", None):
            item["연번"] = n
        items.append(item)
    body = json.dumps(items, ensure_ascii=False, indent=2)
    OUT.write_text(
        "/* 수학 SoftWare 활동 DB\n"
        " * tools/xlsx_to_data.py 로 엑셀 'DB' 시트에서 만든 파일입니다.\n"
        " * 이 파일을 직접 고쳐도 됩니다. (항목 이름 = 엑셀 머리글)\n"
        " */\n"
        f"window.MATHSW_DATA = {body};\n",
        encoding="utf-8",
    )
    print(f"{len(items)}개 활동 → {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
