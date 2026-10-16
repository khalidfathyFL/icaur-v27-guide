"""
Reads the owner manual PDF into structured pages for build-index.mjs.

Plain text extraction loses the headings (they run into the first step), so
this reads font sizes instead. In the V27 manual:

  11.5 pt            chapter running header, "2. BATTERY ELECTRIC SYSTEM"
  10 pt              section heading, "AC Charging (Slow Charging)"
  10 pt bold         sub-heading, "Warning triangle"
  "■ ..."            topic within a section
  9.5 pt             body text and the page number
  under 7 pt         image codes ("OMV27-2060"), dropped

  python scripts/manual/extract.py <manual.pdf> <out.json>
"""
import json
import re
import sys

import pymupdf

CALLOUTS = re.compile(r"^(WARNING|CAUTION|NOTE|READ|DANGER)\b")


def line_kind(spans):
    text = "".join(span["text"] for span in spans).strip()
    sized = [span for span in spans if span["text"].strip()]
    if not sized:
        return None, ""
    main = max(sized, key=lambda span: len(span["text"].strip()))
    size = round(main["size"], 1)
    bold = bool(main["flags"] & 16) or "Bold" in main["font"]
    if size < 7:
        return None, ""
    if size >= 11:
        return "chapter", text
    if size >= 9.9 and not CALLOUTS.match(text):
        return ("subheading" if bold else "heading"), text
    if text.startswith("■"):
        return "topic", text.lstrip("■ ").strip()
    return "text", text.replace("�", "•")


def main(pdf_path, out_path):
    doc = pymupdf.open(pdf_path)
    pages = []
    for index, page in enumerate(doc):
        height = page.rect.height
        lines = []
        printed = None
        for block in page.get_text("dict", sort=True)["blocks"]:
            for line in block.get("lines", []):
                kind, text = line_kind(line["spans"])
                if not kind or not text:
                    continue
                # The page number sits alone at the foot of the page.
                if kind == "text" and re.fullmatch(r"\d{1,3}", text) and line["bbox"][1] > height * 0.88:
                    printed = int(text)
                    continue
                # Running footer next to the page number: "2 Pictorial Index", "FOREWORD 1".
                if line["bbox"][1] > height * 0.9 and len(text) < 40:
                    match = re.fullmatch(r"(\d{1,3})\s+\D.*|\D.*\s(\d{1,3})", text)
                    if match:
                        printed = int(match.group(1) or match.group(2))
                        continue
                lines.append({"kind": kind, "text": text})
        pages.append({"pdfPage": index + 1, "printed": printed, "lines": lines})
        print(f"\rRead page {index + 1}/{len(doc)}", end="", file=sys.stderr)
    print(file=sys.stderr)
    with open(out_path, "w", encoding="utf-8") as out:
        json.dump(pages, out, ensure_ascii=False)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Usage: python scripts/manual/extract.py <manual.pdf> <out.json>")
    main(sys.argv[1], sys.argv[2])
