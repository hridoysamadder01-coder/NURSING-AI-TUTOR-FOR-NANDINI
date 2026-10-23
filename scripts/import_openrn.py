#!/usr/bin/env python3
"""Import publisher-served CC BY Open RN EPUB *text* into the private study app.

No copyrighted third-party pictures, embeds or media are copied.
Original books remain linked. On failure, leave previously synced books alone.
Requires Python 3 standard library only.
"""
import io, json, os, re, time, urllib.request, zipfile
from pathlib import Path
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

BOOKS = [
  ("fundamentals", "Nursing Fundamentals 2e", "https://wtcs.pressbooks.pub/nursingfundamentals/", 2024),
  ("skills", "Nursing Skills 2e", "https://wtcs.pressbooks.pub/nursingskills/", 2023),
  ("terminology", "Medical Terminology 2e", "https://wtcs.pressbooks.pub/medterm/", 2024),
]
OUT = Path("data/books")
MAX_EPUB_SIZE = 70 * 1024 * 1024
MAX_TEXT_PER_BOOK = 12 * 1024 * 1024
NS = {"c": "urn:oasis:names:tc:opendocument:xmlns:container",
      "opf": "http://www.idpf.org/2007/opf"}

def get_epub(base):
    url = base + "open/download?type=epub"
    req = urllib.request.Request(url, headers={"User-Agent": "NandiniNursingStudy/0.2 (educational licensed-source reading)"})
    with urllib.request.urlopen(req, timeout=80) as response:
        length = int(response.headers.get("Content-Length") or 0)
        if length and length > MAX_EPUB_SIZE:
            raise ValueError("EPUB size exceeds cap: " + str(length))
        data = response.read(MAX_EPUB_SIZE + 1)
        if len(data) > MAX_EPUB_SIZE:
            raise ValueError("EPUB streamed size exceeds cap")
        if not data.startswith(b"PK"):
            raise ValueError("Publisher did not return EPUB ZIP")
    return data

def normalized(value):
    return re.sub(r"\s+", " ", value or "").strip()

def inner_text(node):
    return normalized("".join(node.itertext()))

def local_tag(node):
    return node.tag.rsplit("}", 1)[-1].lower() if isinstance(node.tag, str) else ""

def extract_content(root):
    # Keep human-readable text only. EPUB must be valid XHTML.
    body = next((x for x in root.iter() if local_tag(x) == "body"), None)
    if body is None:
        return None, []
    heading = ""
    sections = []
    current = {"heading": "", "paragraphs": []}
    def push():
        if current["paragraphs"]:
            text = "\n\n".join(current["paragraphs"])
            if len(text) >= 60:
                sections.append({"heading": current["heading"], "text": text})
    for node in body.iter():
        tag = local_tag(node)
        # Skip tags nested inside blockquotes or sections? Text extracted from heading/paragraph only.
        if tag in ("h1", "h2", "h3", "h4"):
            new = inner_text(node)
            if not new:
                continue
            if not heading and tag in ("h1", "h2"):
                heading = new
            push()
            current = {"heading": new[:180], "paragraphs": []}
        elif tag in ("p", "dt", "dd"):
            if any(word in str(node.attrib.get("class", "")).lower() for word in
                   ("wp-caption", "figure", "copyright", "attribution", "footnote", "reference", "license")):
                continue
            part = inner_text(node)
            if len(part) > 14 and not part.lower().startswith(("image:", "figure ", "video:", "copyright ©")):
                current["paragraphs"].append(part[:5000])
    push()
    return heading, sections

def parse_epub(epub, book_id):
    with zipfile.ZipFile(io.BytesIO(epub)) as archive:
        rootfile = ET.fromstring(archive.read("META-INF/container.xml"))
        opf_path = rootfile.find(".//c:rootfile", NS).attrib["full-path"]
        opf = ET.fromstring(archive.read(opf_path))
        prefix = os.path.dirname(opf_path)
        manifest = {}
        for item in opf.findall(".//opf:manifest/opf:item", NS):
            manifest[item.attrib["id"]] = item.attrib
        chapters = []
        for idx, item in enumerate(opf.findall(".//opf:spine/opf:itemref", NS)):
            ref = manifest.get(item.attrib.get("idref", ""), {})
            path = os.path.normpath(os.path.join(prefix, ref.get("href", "").split("#", 1)[0]))
            if not path.lower().endswith((".xhtml", ".html", ".htm")) or path not in archive.namelist():
                continue
            try:
                xml = ET.fromstring(archive.read(path))
                title, sections = extract_content(xml)
            except ET.ParseError:
                continue
            if not sections:
                continue
            chapters.append({
                "id": book_id + "-" + str(idx + 1),
                "title": title or ("Part " + str(idx + 1)),
                "sections": sections
            })
        if len(chapters) < 8:
            raise ValueError("Suspiciously few extracted chapters: " + str(len(chapters)))
        return chapters

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {"schema":1, "books": []}
    staged = {}
    for bid, title, url, year in BOOKS:
        epub = get_epub(url)
        chapters = parse_epub(epub, bid)
        doc = {
          "id":bid, "title":title, "publisher":"WisTech Open / Open Resources for Nursing (Open RN)",
          "authors":"Ernstmeyer & Christman", "year":year,
          "license":"CC BY 4.0, except where otherwise noted; text-only transformation",
          "license_url":"https://creativecommons.org/licenses/by/4.0/",
          "source_url":url,
          "official_pdf":url + "open/download?type=pdf",
          "official_epub":url + "open/download?type=epub",
          "modifications":"Converted publisher EPUB XHTML to plain paragraph text. Images, layout and embedded resources omitted.",
          "page_reference":"No PDF page metadata. Citations must identify book and EPUB chapter/section, never guessed page.",
          "chapters":chapters
        }
        data = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(data)>MAX_TEXT_PER_BOOK:
            raise ValueError("Extracted book too large: " + bid + " " + str(len(data)))
        staged[bid] = data
        catalog["books"].append({"id":bid,"title":title,"chapters":len(chapters),"size_bytes":len(data),
               "source_url":url,"official_pdf":doc["official_pdf"],"official_epub":doc["official_epub"],
               "publisher":doc["publisher"],"year":year,"license":doc["license"],"ready":True})
        print("IMPORTED",bid,"epub_kb",len(epub)//1024,"sections",sum(len(ch["sections"]) for ch in chapters),
              "chapters",len(chapters),"index_kb",len(data)//1024,flush=True)
        time.sleep(0.5)
    # Atomic-ish: write only after all validations succeed; workflow commits after script finishes.
    for bid, data in staged.items():
        (OUT/(bid + ".json")).write_bytes(data)
    (OUT/"catalog.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("IMPORT_COMPLETE",len(catalog["books"]),flush=True)

if __name__ == "__main__":
    main()
