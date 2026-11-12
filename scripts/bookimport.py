#!/usr/bin/env python3
"""Shared helpers for the licensed book importers (OpenStax, NCI SEER).

Turns publisher HTML/XHTML into the same text-only book shape the Open RN importer writes:
  {id,title,...,chapters:[{id,title,url,sections:[{heading,text,blocks:[{type,text}]}]}]}
Images, figures, captions, media and interactive embeds are dropped, so third-party media rights are never copied.
Also owns the catalog merge, so one importer never deletes another importer's books.
"""
import hashlib, json, re, sys, time, urllib.request
from html.parser import HTMLParser
from pathlib import Path

OUT = Path("data/books")
USER_AGENT = "NandiniNursingStudy/0.3 (source-attributed educational import)"
VOID = {"br", "img", "hr", "input", "meta", "link", "source", "col", "wbr", "area", "base", "embed", "param", "track"}
BANNED = {"figure", "figcaption", "img", "svg", "video", "audio", "iframe", "object", "embed", "script", "style",
          "noscript", "canvas", "button", "nav", "form", "head", "title"}
HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
BLOCKY = {"p", "ul", "ol", "dl", "table", "div", "section", "blockquote"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs or {}), [], parent

    def get(self, name, default=""):
        return self.attrs.get(name) or default

    def classes(self):
        return self.get("class").split()

    def nodes(self):
        return [c for c in self.children if isinstance(c, Node)]

    def iter(self):
        yield self
        for c in self.children:
            if isinstance(c, Node):
                yield from c.iter()

    def find(self, pred):
        return next((n for n in self.iter() if pred(n)), None)


class _Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.cur = self.root

    def _open(self, tag, attrs, void=False):
        # Publisher HTML sometimes leaves <p> and <li> open; close the previous one like a browser does.
        if tag in ("p", "li") and self.cur.tag == tag:
            self.cur = self.cur.parent
        node = Node(tag, [(k, v or "") for k, v in attrs], self.cur)
        self.cur.children.append(node)
        if not void and tag not in VOID:
            self.cur = node

    def handle_starttag(self, tag, attrs):
        self._open(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self._open(tag, attrs, void=True)

    def handle_endtag(self, tag):
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.cur = node.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse_html(markup):
    parser = _Tree()
    parser.feed(markup)
    parser.close()
    return parser.root


def normal(s):
    return re.sub(r"\s+", " ", s or "").strip()


def _wrap(s):
    return s if re.fullmatch(r"[\w.]+", s) else "(" + s + ")"


def math_text(node):
    """MathML as one readable line: fractions (a)/(b), powers a^b, H2O and Ca2+ for formulas."""
    if isinstance(node, str):
        return node
    tag = node.tag.split(":")[-1]
    kids = node.nodes()
    part = lambda i: normal(math_text(kids[i]))
    if tag in ("annotation", "annotation-xml"):
        return ""
    if tag == "mfrac" and len(kids) == 2:
        return "(" + part(0) + ")/(" + part(1) + ")"
    if tag == "msup" and len(kids) == 2:
        up = part(1)
        return part(0) + ("^" + _wrap(up) if re.fullmatch(r"[−–-]?[\w.]+", up) and not re.fullmatch(r"\d*[+−–-]", up) else up)
    if tag == "msub" and len(kids) == 2:
        low = part(1)
        return part(0) + (low if re.fullmatch(r"\d+", low) else "_" + _wrap(low))
    if tag == "msubsup" and len(kids) == 3:
        low, up = part(1), part(2)
        return part(0) + (low if re.fullmatch(r"\d+", low) else "_" + _wrap(low)) + (up if re.fullmatch(r"\d*[+−–-]", up) else "^" + _wrap(up))
    if tag == "msqrt":
        return "sqrt(" + normal("".join(math_text(c) for c in node.children)) + ")"
    if tag == "mroot" and len(kids) == 2:
        return "root" + _wrap(part(1)) + "(" + part(0) + ")"
    if tag in ("mover", "munder", "munderover") and kids:
        return " ".join(part(i) for i in range(len(kids)))
    if tag == "mtr":
        return " ".join(normal(math_text(c)) for c in kids) + "; "
    if tag == "mo":
        return " " + "".join(math_text(c) for c in node.children).strip() + " "
    return "".join(math_text(c) for c in node.children)


def inline_text(node, skip=None):
    """Text of one block: no images or footnote marks; superscript numbers keep a ^ so 10^6 does not read as 106."""
    out = []

    def walk(x):
        if isinstance(x, str):
            out.append(x)
            return
        tag = x.tag
        if tag in BANNED or (skip and skip(x)):
            return
        if tag == "br":
            out.append(" ")
            return
        if tag.split(":")[-1] == "math":
            out.append(" " + normal(math_text(x)) + " ")
            return
        if x.get("role") in ("doc-noteref", "doc-footnote") or x.get("data-type") in ("footnote-ref", "footnote-number", "footnote-refs"):
            return
        if tag == "sup":
            inner = Node("span")
            inner.children = x.children
            t = inline_text(inner, skip)
            before = "".join(out)[-1:]
            if re.fullmatch(r"[−–-]?\d+", t) and (before.isalnum() or before == ")"):
                out.append("^" + t)
            else:
                out.append(t)
            return
        for c in x.children:
            walk(c)

    walk(node)
    return re.sub(r"\s+([,.;:)])", r"\1", normal("".join(out)))


def _table_rows(table, skip):
    rows = []
    for tr in (n for n in table.iter() if n.tag == "tr"):
        cells = [inline_text(c, skip) for c in tr.nodes() if c.tag in ("td", "th")]
        line = " | ".join(c for c in cells if c)
        if line:
            rows.append(line)
    return rows


def build_sections(root, title, skip=None, boxes=None, exercise=None, leaf=None):
    """Flatten a chapter body into [{heading,text,blocks}].

    skip(node)      -> True to drop a subtree (figures and media are always dropped).
    boxes(node)     -> a heading string when the node is a call-out box; text after it returns to the outer heading.
    exercise(node)  -> a ready block text for a question node, or None.
    leaf(node)      -> True when the node is one block of its own (a displayed equation).
    """
    sections, state = [], {"head": title, "blocks": []}

    def flush():
        blocks = state["blocks"]
        if blocks:
            body = "\n\n".join(t for _, t in blocks)
            if len(body) > 1:
                sections.append({"heading": state["head"][:180], "text": body,
                                 "blocks": [{"type": kind, "text": t} for kind, t in blocks]})
        state["blocks"] = []

    def add(kind, text):
        text = normal(text)
        if len(text) > 1:
            state["blocks"].append((kind, text[:6000]))

    def visit(x, list_type=None, in_box=False):
        if isinstance(x, str):
            return
        tag = x.tag
        if tag in BANNED or (skip and skip(x)):
            return
        if exercise:
            done = exercise(x)
            if done is not None:
                if done:
                    add("numbered", done)
                return
        box = boxes(x) if boxes and not in_box else None
        if box:
            outer = state["head"]
            flush()
            state["head"] = box
            for c in x.children:
                visit(c, list_type, True)
            flush()
            state["head"] = outer if outer.endswith(" (continued)") or outer == title else outer + " (continued)"
            return
        if leaf and leaf(x):
            add("paragraph", inline_text(x, skip))
            return
        if tag in HEADINGS:
            h = inline_text(x, skip)
            if in_box:
                # "Solution", "Check Your Learning" inside an example stay visible as a small label.
                if h and h not in state["head"]:
                    add("paragraph", h.rstrip(":") + ":")
                return
            if h and h != title:
                flush()
                state["head"] = h
            return
        if tag == "ol":
            list_type = "numbered"
        elif tag == "ul":
            list_type = "bullet"
        if tag == "table":
            for line in _table_rows(x, skip):
                add("paragraph", line)
            return
        if tag == "dl":
            term = ""
            for c in x.nodes():
                if c.tag == "dt":
                    term = inline_text(c, skip)
                elif c.tag == "dd":
                    add("bullet", (term + ": " if term else "") + inline_text(c, skip))
                    term = ""
            return
        if tag in ("p", "li", "blockquote", "pre"):
            if any(c.tag in BLOCKY for c in x.nodes()):
                for c in x.children:
                    visit(c, list_type, in_box)
                return
            kind = (list_type or "bullet") if tag == "li" else "paragraph"
            add(kind, inline_text(x, skip))
            return
        for c in x.children:
            visit(c, list_type, in_box)

    visit(root)
    flush()
    return sections


def fetch(url, cache=None, tries=4, expect=None):
    """Download with an honest User-Agent; optional on-disk cache so a re-run does not hit the publisher again."""
    path = None
    if cache:
        path = Path(cache) / hashlib.sha256(url.encode()).hexdigest()[:32]
        if path.exists():
            return path.read_bytes()
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read()
            if expect and not expect(raw):
                raise ValueError("unexpected content from " + url)
            if path:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(raw)
            return raw
        except Exception as error:  # network hiccups are retried; a real failure stops the import
            last = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("download failed: " + url + " (" + str(last) + ")")


def pack(book):
    return json.dumps(book, ensure_ascii=False, separators=(",", ":")).encode("utf8")


def stats(book):
    sections = sum(len(c["sections"]) for c in book["chapters"])
    chars = sum(len(s["text"]) for c in book["chapters"] for s in c["sections"])
    return sections, chars


def merge_catalog(entries, out=OUT):
    """Replace only the given book ids in catalog.json; every other book and key stays exactly as it was."""
    path = Path(out) / "catalog.json"
    catalog = json.loads(path.read_text(encoding="utf8")) if path.exists() else {"schema": 2, "books": []}
    by_id = {e["id"]: e for e in entries}
    books = [by_id.pop(b["id"], b) for b in catalog.get("books", [])]
    books.extend(by_id.values())
    catalog["schema"] = max(2, int(catalog.get("schema", 1)))
    catalog["books"] = books
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return catalog


def publish(books, out=OUT, compact=False):
    """books: [(book_dict, catalog_extra)]. Writes every file only after all of them were built.

    compact: store each section as blocks only (its text is the blocks joined by blank lines), which halves the file.
    """
    entries = []
    for book, extra in books:
        sections, chars = stats(book)
        book["section_shape"] = "blocks" if compact else "text+blocks"
        if compact:
            for chapter in book["chapters"]:
                for section in chapter["sections"]:
                    section.pop("text", None)
        raw = pack(book)
        (Path(out) / (book["id"] + ".json")).write_bytes(raw)
        entry = {"id": book["id"], "title": book["title"], "chapters": len(book["chapters"]), "size_bytes": len(raw),
                 "source_url": book["source_url"], "publisher": book["publisher"], "year": book["year"],
                 "license": book["license"], "license_url": book["license_url"], "ready": True,
                 "access": "bundled", "ai_use": book["ai_use"], "attribution": book["attribution"],
                 "sections": sections, "text_chars": chars, "sha256": hashlib.sha256(raw).hexdigest()}
        entry.update(extra)
        entries.append(entry)
        print("IMPORTED", book["id"], "chapters", len(book["chapters"]), "sections", sections, "text_kb", len(raw) // 1024, flush=True)
    merge_catalog(entries, out)
    return entries


def _selftest():
    import tempfile
    html = """<div><h2>Cells</h2><p>Water is H<sub>2</sub>O and there are 10<sup>6</sup> cells<sup><a role="doc-noteref">1</a></sup>.</p>
    <figure><img src="x.png"/><figcaption>Third-party photo credit</figcaption></figure>
    <ul><li>skeletal</li><li>cardiac<li>smooth</ul>
    <div data-type="note"><h3>Everyday Connection</h3><p>A box paragraph about hypothermia.</p></div>
    <p>After the box the text returns to the section.</p><div data-type="equation"><math><mi>pH</mi><mo>=</mo><mn>7</mn></math></div>
    <table><tr><th>Nerve</th><th>Function</th></tr><tr><td>Optic</td><td>Vision</td></tr></table>
    <dl><dt>anabolism</dt><dd>assembly of complex molecules</dd></dl>
    <p>Ion: Ca<sup>2+</sup>; math <math><mfrac><mn>1</mn><mn>2</mn></mfrac><msup><mi>x</mi><mn>2</mn></msup><msub><mi>CO</mi><mn>2</mn></msub></math>.</p></div>"""
    boxes = lambda n: "Everyday Connection" if n.get("data-type") == "note" else None
    sections = build_sections(parse_html(html), "1.1 Test", boxes=boxes, leaf=lambda n: n.get("data-type") == "equation")
    text = "\n".join(s["heading"] + "::" + s["text"] for s in sections)
    assert "H2O" in text and "10^6 cells." in text, text
    assert "photo credit" not in text and "x.png" not in text, text
    assert [b["text"] for s in sections for b in s["blocks"] if b["type"] == "bullet"][:3] == ["skeletal", "cardiac", "smooth"], text
    assert [s["heading"] for s in sections] == ["Cells", "Everyday Connection", "Cells (continued)"], [s["heading"] for s in sections]
    assert "Optic | Vision" in text and "anabolism: assembly of complex molecules" in text, text
    assert "pH = 7" in text, text
    assert "Ca2+" in text and "(1)/(2)" in text and "x^2" in text and "CO2" in text, text
    with tempfile.TemporaryDirectory() as tmp:
        old = {"schema": 1, "books": [{"id": "fundamentals", "title": "Nursing Fundamentals 2e", "chapters": 141, "ready": True}]}
        Path(tmp, "catalog.json").write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
        merged = merge_catalog([{"id": "new-book", "title": "New"}], tmp)
        assert [b["id"] for b in merged["books"]] == ["fundamentals", "new-book"] and merged["books"][0] == old["books"][0]
        merged = merge_catalog([{"id": "new-book", "title": "Newer"}], tmp)
        assert [b["title"] for b in merged["books"]] == ["Nursing Fundamentals 2e", "Newer"] and merged["schema"] == 2
    print("bookimport selftest ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        _selftest()
