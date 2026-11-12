#!/usr/bin/env python3
"""Import OpenStax textbooks as text-only reading copies, from the publisher's own archive (the source of openstax.org).

Licence, checked per book from the publisher's metadata and web page at import time: CC BY-NC-SA 4.0.
OpenStax also states that its books may not be ingested into large language models or generative AI offerings
without written permission, so every book is written with ai_use "not_permitted": the app may show and search the
text, but must never send it to a language model. Images, figures, captions and media are not copied.

  python3 scripts/import_openstax.py [--cache DIR] [--only id,id] [--survey]
"""
import argparse, collections, concurrent.futures, datetime, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from bookimport import build_sections, fetch, inline_text, normal, parse_html, publish, stats

SITE = "https://openstax.org"
LICENSE_URL = "creativecommons.org/licenses/by-nc-sa/4.0/"
AI_SENTENCE = "may not be used in the training of large language models or otherwise be ingested into large language models or generative AI offerings"
# id, publisher slug, publisher book uuid, Nandini's subject codes
BOOKS = [
    ("openstax-anatomy", "anatomy-and-physiology-2e", "4fd99458-6fdf-49bc-8688-a6dc17a1268d", ["D123"]),
    ("openstax-microbiology", "microbiology", "e42bd376-624b-4c0f-972f-e0c57998e765", ["D124"]),
    ("openstax-biology", "biology-2e", "8d50a0af-948b-4204-a71d-4826cba765b8", ["D112"]),
    ("openstax-chemistry", "chemistry-2e", "7fccc9cf-9b71-44f6-800b-f9457fd64335", ["D112"]),
    ("openstax-psychology", "psychology-2e", "06aba565-9432-40f6-97ee-b8a361f118a8", ["D111"]),
    ("openstax-sociology", "introduction-sociology-3e", "746f171e-0d6a-4ef2-b69d-367880872f4a", ["D111"]),
    ("openstax-workplace", "workplace-software-skills", "3d2454dc-2735-4e24-a7e0-f89a79893699", ["D117"]),
]
# Pages that are useless or misleading as plain text. Everything skipped is listed in the book file.
SKIP_TITLES = {"index": "index_needs_print_pages", "references": "bibliography_only", "interactive link questions": "needs_external_media",
               "visual connection questions": "needs_the_figure", "bibliography": "bibliography_only", "suggested reading": "bibliography_only"}
# Call-out boxes that only point at a video, a simulation or a figure.
SKIP_BOX = re.compile(r"\b(interactive|link-to-learning|media-2|visual-connection|art-connection|ost-reading-discard|os-teacher)\b")
SKIP_CLASS = re.compile(r"\b(os-figure|os-caption-container|os-noscript|os-newline|os-equation-number|ui-has-child-figcaption)\b")


def strip_tags(markup):
    return normal(inline_text(parse_html(markup or "")))


def skip(node):
    kind = node.get("data-type")
    if kind in ("document-title", "media", "footnote-refs", "footnote-ref", "newline", "metadata"):
        return True
    cls = node.get("class")
    if cls and SKIP_CLASS.search(cls):
        return True
    if node.tag == "aside" or node.get("role") == "doc-footnote":
        return True
    return kind == "note" and bool(SKIP_BOX.search(cls))


def boxes(node):
    kind = node.get("data-type")
    if kind == "abstract":
        return "Learning Objectives"
    if kind not in ("note", "example"):
        return None
    heads = [n for n in node.iter() if n.tag in ("h2", "h3", "h4", "h5", "h6")]
    parts = [inline_text(heads[0], skip)] if heads else []
    if len(heads) > 1 and ("os-subtitle" in heads[1].classes() or kind == "example"):
        parts.append(inline_text(heads[1], skip))
    return ": ".join(p for p in parts if p)[:170] or ("Example" if kind == "example" else "Note")


def _body(node):
    """Question text with its options on one line: "... ? (a) x (b) y"."""
    out = []

    def walk(x):
        if isinstance(x, str):
            return
        if x.tag in ("figure", "img") or skip(x) or "os-number" in x.classes() or "os-divider" in x.classes():
            return
        if x.tag in ("ol", "ul"):
            items = [inline_text(li, skip) for li in x.nodes() if li.tag == "li"]
            out.append(" ".join("(" + "abcdefghijklmnop"[i % 16] + ") " + t for i, t in enumerate(items) if t))
            return
        if not any(c.tag in ("p", "ol", "ul", "div", "table", "section") for c in x.nodes()):
            out.append(inline_text(x, skip))
            return
        for c in x.children:
            walk(c)

    walk(node)
    return normal(" ".join(t for t in out if t))


def exercise(node):
    kind = node.get("data-type")
    if kind not in ("exercise", "solution", "injected-exercise"):
        return None
    number = node.find(lambda n: "os-number" in n.classes())
    num = inline_text(number) if number is not None else ""
    if kind == "solution":
        text = _body(node)
        return (num + ". " if num else "") + text if text else ""
    problem = node.find(lambda n: n.get("data-type") in ("problem", "exercise-question")) or node
    text = _body(problem)
    solution = node.find(lambda n: n.get("data-type") == "solution")
    if solution is not None and solution is not node:
        answer = _body(solution)
        if answer:
            text += " — Answer: " + answer
    return (num + ". " if num else "") + text if text else ""


def leaves(tree):
    """Publisher TOC order: [(leaf, parents)]."""
    out = []

    def walk(node, parents):
        kids = node.get("contents")
        if kids:
            for kid in kids:
                walk(kid, parents + [node])
        else:
            out.append((node, parents))

    for top in tree.get("contents", []):
        walk(top, [])
    return out


def chapter_title(leaf, parents):
    """(unique reading title, group label), e.g. ("5 Review Questions: Multiple Choice", "Chapter 5 The Eukaryotes of Microbiology")."""
    title = strip_tags(leaf.get("title"))
    chapter = next((p for p in reversed(parents) if p.get("toc_type") == "chapter"), None)
    if chapter is None:
        if not parents:
            return title, "Front and back matter"
        group = strip_tags(parents[-1].get("title"))
        return group + ": " + title, group
    group = strip_tags(chapter.get("title"))
    between = [strip_tags(p.get("title")) for p in parents[parents.index(chapter) + 1:]]
    if re.match(r"\d+\.\d+", title):
        return title, group
    number = re.match(r"(?:Chapter\s*)?(\d+)\s*(.*)", group)
    if not number:
        return ": ".join([group] + between + [title]), group
    if leaf.get("toc_target_type") == "intro":
        return number.group(1) + " " + number.group(2) + ": " + title, group
    return number.group(1) + " " + ": ".join(between + [title]), group


def import_book(bid, slug, uuid, subjects, release, cache, survey=None):
    archive = SITE + release["archiveUrl"]
    version = release["books"][uuid]["defaultVersion"]
    if release["books"][uuid].get("retired"):
        raise ValueError(slug + " is retired by the publisher")
    meta = json.loads(fetch(f"{archive}/contents/{uuid}@{version}.json", cache))
    license_url = (meta.get("license") or {}).get("url", "")
    if LICENSE_URL not in license_url or meta.get("slug") != slug:
        raise ValueError(f"{slug}: publisher metadata changed (license {license_url!r}, slug {meta.get('slug')!r}); review before importing")
    preface = fetch(f"{SITE}/books/{slug}/pages/preface", cache).decode("utf8", "replace")
    page_text = normal(inline_text(parse_html(preface)))
    if "Attribution-NonCommercial-ShareAlike" not in page_text:
        raise ValueError(slug + ": the book's web page no longer states CC BY-NC-SA; review before importing")
    access = re.search(r"Access for free at (https://openstax\.org/books/[\w\-/]+)", page_text)
    if not access:
        raise ValueError(slug + ": the publisher's attribution line was not found")
    toc = leaves(meta["tree"])
    todo, skipped = [], []
    for leaf, parents in toc:
        title = strip_tags(leaf.get("title"))
        reason = SKIP_TITLES.get(title.lower())
        if reason:
            skipped.append({"title": chapter_title(leaf, parents)[0], "slug": leaf.get("slug"), "reason": reason})
        else:
            todo.append((leaf, parents))

    def load(item):
        leaf, _ = item
        page = json.loads(fetch(f"{archive}/contents/{uuid}@{version}:{leaf['id'].split('@')[0]}.json", cache))
        return parse_html(page["content"])

    with concurrent.futures.ThreadPoolExecutor(6) as pool:
        trees = list(pool.map(load, todo))
    chapters = []
    for (leaf, parents), tree in zip(todo, trees):
        title, group = chapter_title(leaf, parents)
        if survey is not None:
            for n in tree.iter():
                if n.get("data-type") in ("note", "example"):
                    survey[("box", n.get("class"), bool(skip(n)))] += 1
        sections = build_sections(tree, title, skip=skip, boxes=boxes, exercise=exercise, leaf=lambda n: n.get("data-type") == "equation")
        if not sections:
            skipped.append({"title": title, "slug": leaf.get("slug"), "reason": "no_text_after_removing_media"})
            continue
        chapters.append({"id": bid + "-" + str(len(chapters) + 1), "title": title, "group": group,
                         "kind": leaf.get("toc_target_type") or "page", "url": f"{SITE}/books/{slug}/pages/{leaf['slug']}",
                         "sections": sections})
    if len(chapters) + len(skipped) != len(toc):
        raise ValueError(slug + ": page count does not add up")
    if len({c["title"] for c in chapters}) != len(chapters):
        raise ValueError(slug + ": chapter titles are not unique")
    if len(chapters) < 0.75 * len(toc) or len({c["url"] for c in chapters}) != len(chapters):
        raise ValueError(f"{slug}: incomplete import, {len(chapters)} of {len(toc)} pages")
    book = {"id": bid, "title": meta["title"], "publisher": "OpenStax, Rice University",
            "authors": "OpenStax contributing authors (named in the book's Preface)", "year": int(meta["revised"][:4]),
            "license": "CC BY-NC-SA 4.0; modified text-only extract, shared under the same license",
            "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "source_url": f"{SITE}/details/books/{slug}", "chapter_url_base": f"{SITE}/books/{slug}/pages/",
            "attribution": "Access for free at " + access.group(1),
            "ai_use": "not_permitted",
            "ai_use_reason": "Publisher statement on the book's web page: \"This book " + AI_SENTENCE + " without OpenStax's prior written permission.\"",
            "publisher_ai_statement_seen": AI_SENTENCE in page_text,
            "modifications": "Publisher XHTML transformed into searchable plain-text sections. Images, figures, captions, embedded media, footnotes, "
                             "interactive boxes and page layout omitted. Tables flattened to rows, equations written on one line (fractions as (a)/(b), powers as ^). "
                             "Check the publisher's page for the exact typeset form.",
            "page_reference": "No PDF page metadata. Cite book, section title and its openstax.org URL only.",
            "source_version": version + " (archive " + release["archiveUrl"].rsplit("/", 1)[-1] + ")",
            "revised": meta["revised"][:10], "toc_pages": len(toc), "skipped_pages": skipped, "chapters": chapters}
    sections, chars = stats(book)
    if chars < 400_000:
        raise ValueError(f"{slug}: unexpectedly little text ({chars} characters)")
    extra = {"read_url": access.group(1), "chapter_url_base": book["chapter_url_base"], "source_version": book["source_version"],
             "revised": book["revised"], "retrieved": datetime.date.today().isoformat(), "toc_pages": len(toc),
             "skipped_pages": len(skipped), "subjects": subjects}
    return book, extra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache")
    ap.add_argument("--only", default="")
    ap.add_argument("--survey", action="store_true", help="print box classes and skipped pages, write nothing")
    args = ap.parse_args()
    only = {x for x in args.only.split(",") if x}
    release = json.loads(fetch(SITE + "/rex/release.json", args.cache))
    built = []
    for bid, slug, uuid, subjects in BOOKS:
        if only and bid not in only:
            continue
        survey = collections.Counter() if args.survey else None
        book, extra = import_book(bid, slug, uuid, subjects, release, args.cache, survey)
        if args.survey:
            print(bid, "pages", book["toc_pages"], "chapters", len(book["chapters"]), "chars", stats(book)[1],
                  "ai_statement", book["publisher_ai_statement_seen"])
            print("  skipped", collections.Counter(s["reason"] for s in book["skipped_pages"]).most_common())
            print("  kinds", collections.Counter(c["kind"] for c in book["chapters"]).most_common())
            print("  boxes", [(k[1], k[2], v) for k, v in survey.most_common(40)])
        built.append((book, extra))
    if not args.survey:
        publish(built, compact=True)
        print("IMPORT_COMPLETE", len(built), flush=True)


if __name__ == "__main__":
    main()
