#!/usr/bin/env python3
"""Import the U.S. National Cancer Institute's "SEER Training Modules: Anatomy & Physiology" as text.

NCI's Reuse of Text policy (checked at import time): "Unless otherwise indicated, all text within National Cancer
Institute (NCI) products is free of copyright and may be reused without our permission. Credit the National Cancer
Institute as the source." Graphics are a mix of copyrighted and free material, so no image is copied.
The module is an introductory overview written for cancer-registry trainees, not a nursing textbook.

  python3 scripts/import_seer.py [--cache DIR] [--survey]
"""
import argparse, datetime, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from bookimport import build_sections, fetch, inline_text, normal, parse_html, publish, stats

BASE = "https://training.seer.cancer.gov"
START = "/anatomy/"
POLICY_URL = "https://www.cancer.gov/policies/copyright-reuse"
POLICY = "Unless otherwise indicated, all text within National Cancer Institute (NCI) products is free of copyright and may be reused without our permission."
# A page that carries its own rights notice is "otherwise indicated" and is left out.
NOTICE = re.compile(r"©|\bcopyright\b|reprinted|with permission|courtesy of|all rights reserved", re.I)


def _page_menu(node):
    """The "On this page..." list of in-page links is navigation, not text."""
    if node.tag == "p":
        return inline_text(node).lower().startswith("on this page")
    if node.tag != "ul":
        return False
    items = [c for c in node.nodes() if c.tag == "li"]
    return bool(items) and all(len(li.nodes()) == 1 and li.nodes()[0].tag == "a" and li.nodes()[0].get("href").startswith("#")
                               and not normal("".join(c for c in li.children if isinstance(c, str))) for li in items)


def skip(node):
    return node.get("id") in ("prevNext", "pgNav", "breadcrumbs") or "citation-wrap" in node.classes() or _page_menu(node)


def toc(index):
    nav = index.find(lambda n: n.tag == "ul" and "usa-sidenav" in n.classes())
    if nav is None:
        raise ValueError("SEER navigation not found")
    pages, unit = [], ""

    def walk(node, depth):
        nonlocal unit
        for c in node.nodes():
            if c.tag == "a" and c.get("href").startswith(START) and "display:none" not in (c.parent.get("style") or ""):
                name = inline_text(c)
                if depth == 2:
                    unit = name
                if not any(p["href"] == c.get("href") for p in pages):
                    pages.append({"href": c.get("href"), "nav": name, "unit": unit if depth >= 2 else "Anatomy & Physiology"})
            walk(c, depth + (1 if c.tag == "ul" else 0))

    walk(nav, 1)
    return pages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache")
    ap.add_argument("--survey", action="store_true")
    args = ap.parse_args()
    policy = normal(inline_text(parse_html(fetch(POLICY_URL, args.cache).decode("utf8", "replace"))))
    if POLICY not in policy:
        raise ValueError("NCI reuse policy text changed; review before importing")
    index = parse_html(fetch(BASE + START, args.cache).decode("utf8", "replace"))
    if "National Cancer Institute" not in inline_text(index):
        raise ValueError("SEER page no longer identifies the National Cancer Institute")
    pages = toc(index)
    chapters, skipped = [], []
    for page in pages:
        tree = parse_html(fetch(BASE + page["href"], args.cache).decode("utf8", "replace"))
        h1 = tree.find(lambda n: n.tag == "h1")
        body = h1.parent if h1 is not None else None
        title = inline_text(h1) if h1 is not None else ""
        if body is None or not title:
            skipped.append({"title": page["nav"], "slug": page["href"], "reason": "no_main_content"})
            continue
        sections = build_sections(body, title, skip=skip)
        text = " ".join(s["text"] for s in sections)
        if not sections:
            skipped.append({"title": title, "slug": page["href"], "reason": "no_text_after_removing_media"})
            continue
        if NOTICE.search(text):
            skipped.append({"title": title, "slug": page["href"], "reason": "page_carries_its_own_rights_notice"})
            continue
        if any(c["title"] == title for c in chapters):
            title = page["unit"] + ": " + title
        chapters.append({"id": "seer-anatomy-" + str(len(chapters) + 1), "title": title, "group": page["unit"],
                         "kind": "page", "url": BASE + page["href"], "sections": sections})
    if len(chapters) + len(skipped) != len(pages) or len(chapters) < 60 or len({c["title"] for c in chapters}) != len(chapters):
        raise ValueError(f"SEER import incomplete: {len(chapters)} of {len(pages)} pages")
    book = {"id": "seer-anatomy", "title": "SEER Training Modules: Anatomy & Physiology",
            "publisher": "U.S. National Cancer Institute (NIH), SEER Program", "authors": "National Cancer Institute", "year": None,
            "license": "Text free of copyright (U.S. National Cancer Institute, Reuse of Text policy); modified text-only extract",
            "license_url": POLICY_URL, "source_url": BASE + START, "chapter_url_base": BASE + START,
            "attribution": "SEER Training Modules: Anatomy & Physiology was originally published by the National Cancer Institute. " + BASE + START,
            "ai_use": "allowed",
            "ai_use_reason": "NCI Reuse of Text policy: \"" + POLICY + " Credit the National Cancer Institute as the source.\"",
            "scope_note": "Introductory overview written as training for cancer-registry staff. It is not a nursing textbook and not medical advice.",
            "modifications": "Publisher web pages transformed into searchable plain-text sections. Images, diagrams, navigation and glossary pop-ups omitted.",
            "page_reference": "Web pages have no page numbers. Cite the module, page title and its URL only.",
            "source_version": "web pages as retrieved", "toc_pages": len(pages), "skipped_pages": skipped, "chapters": chapters}
    sections, chars = stats(book)
    if args.survey:
        print("seer-anatomy pages", len(pages), "chapters", len(chapters), "sections", sections, "chars", chars, "skipped", skipped)
        print(" units", sorted({c["group"] for c in chapters}))
        for c in chapters[:3] + chapters[40:42]:
            print(" ", c["title"], "|", c["url"], "|", [s["heading"][:30] for s in c["sections"]][:5], "|", c["sections"][0]["blocks"][0]["text"][:110])
        return
    if chars < 150_000:
        raise ValueError("SEER import has unexpectedly little text")
    publish([(book, {"chapter_url_base": book["chapter_url_base"], "source_version": book["source_version"],
                     "retrieved": datetime.date.today().isoformat(), "toc_pages": len(pages), "skipped_pages": len(skipped),
                     "subjects": ["D123"]})])
    print("IMPORT_COMPLETE 1", flush=True)


if __name__ == "__main__":
    main()
