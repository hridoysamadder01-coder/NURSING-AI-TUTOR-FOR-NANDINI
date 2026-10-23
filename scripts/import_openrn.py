#!/usr/bin/env python3
"""Import public Open RN XHTML text, resolving official chapter URLs from Pressbooks XML.

Deliberately strips images, captions, interactive embeds and third-party media.
Preserves publisher attribution, chapter headings and section links. No user uploads.
"""
import json, re, time, urllib.request
from html.entities import name2codepoint
from pathlib import Path
from xml.etree import ElementTree as ET

BOOKS=[
 ("fundamentals","Nursing Fundamentals 2e","https://wtcs.pressbooks.pub/nursingfundamentals/",2024),
 ("skills","Nursing Skills 2e","https://wtcs.pressbooks.pub/nursingskills/",2023),
 ("terminology","Medical Terminology 2e","https://wtcs.pressbooks.pub/medterm/",2024),
 ("mentalhealth","Nursing Mental Health and Community Concepts 2e","https://wtcs.pressbooks.pub/nursingmhcc/",2025),
 ("anatomy","General Anatomy & Physiology","https://wtcs.pressbooks.pub/anatphys/",2026),
]
OUT=Path("data/books")
WP="{http://wordpress.org/export/1.2/}"
MAX_INPUT=20*1024*1024
MAX_TEXT=12*1024*1024
BANNED={"figure","figcaption","img","svg","video","audio","iframe","object","embed","script","style","noscript","canvas"}
BANNED_CLASSES={"license-attribution","photo-credit","image-credit","shutterstock","footnote","footnotes","media-attribution"}

def normal(s):
    return re.sub(r"\s+"," ",s or "").strip()

def local(el):
    return el.tag.rsplit("}",1)[-1].lower() if isinstance(el.tag,str) else ""

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":"NandiniNursingStudy/0.2 (source-attributed educational import)"})
    with urllib.request.urlopen(req,timeout=70) as r:
        if int(r.headers.get("Content-Length") or 0)>MAX_INPUT:raise ValueError("Source size limit exceeded")
        raw=r.read(MAX_INPUT+1)
        if len(raw)>MAX_INPUT or not raw.lstrip().startswith(b"<?xml"):
            raise ValueError("Source was not expected XML")
        return raw

def fulltext(node):
    # Copy text only, discard image captions/third-party embeds/license footnote markup.
    def collect(el):
        if local(el) in BANNED or any(b in el.attrib.get("class","") for b in BANNED_CLASSES):
            return ""
        text=el.text or ""
        for child in el:
            text+=collect(child)+(child.tail or "")
        return text
    return normal(collect(node))

def official_links(wxr,base):
    root=ET.fromstring(wxr)
    mapping={}
    for item in root.findall("./channel/item"):
        if item.findtext(WP+"post_type")!="chapter":continue
        title=normal(item.findtext("title"))
        link=normal(item.findtext("link"))
        if title and link.startswith(base):
            mapping[title]=link
    return mapping

def sections_for(node,title):
    sections=[]
    head=title
    text=[]
    def flush():
        if text:
            body="\n\n".join(text)
            if len(body)>35:
                sections.append({"heading":head[:180],"text":body})
    def visit(x):
        nonlocal head,text
        tag=local(x)
        if tag in BANNED or any(b in x.attrib.get("class","") for b in BANNED_CLASSES):
            return
        if tag in ("h1","h2","h3","h4"):
            h=fulltext(x)
            if h and h!=title:
                flush()
                head=h
                text=[]
            return
        if tag in ("p","li","td","dt","dd"):
            t=fulltext(x)
            if len(t)>15 and not t.lower().startswith(("figure ","image:","video:","copyright ©")):
                text.append(t[:5000])
            return
        for child in x:
            visit(child)
    # Only use actual chapter body, not nav or copyright/contents.
    ugc=next((x for x in node.iter() if "chapter-ugc" in x.attrib.get("class","")),node)
    visit(ugc)
    flush()
    return sections

def parse(xhtml,linkmap,base,bid):
    # Pressbooks XHTML contains HTML named entities not declared to stdlib XML.
    # Convert known HTML entities to their numeric XML equivalents.
    raw=xhtml.decode("utf-8-sig")
    def named_entity(m):
        name=m.group(1)
        if name in ("amp","lt","gt","quot","apos"):return m.group(0)
        code=name2codepoint.get(name)
        return ("&#"+str(code)+";") if code is not None else " "
    raw=re.sub(r"&([A-Za-z][A-Za-z0-9]+);",named_entity,raw)
    doc=ET.fromstring(raw)
    chapters=[]
    missing_links=[]
    for el in doc.iter():
        if local(el)!="div" or not el.attrib.get("id","").startswith("chapter-slug-"):
            continue
        title=normal(el.attrib.get("title"))
        if not title:
            h=next((x for x in el.iter() if local(x)=="h1"),None)
            title=fulltext(h) if h is not None else ""
        if not title:
            continue
        sections=sections_for(el,title)
        if not sections:
            continue
        url=linkmap.get(title)
        if not url:
            missing_links.append(title)
            # Keep a safe, verified book homepage, do not fabricate exact chapter URL.
            url=base
        chapters.append({"id":bid+"-"+str(len(chapters)+1),"title":title,
                         "url":url,"sections":sections})
    if len(chapters)<65:
        raise ValueError("Incomplete XHTML import, only "+str(len(chapters))+" chapters")
    return chapters,missing_links

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    catalog={"schema":1,"books":[]}
    staged={}
    for bid,title,base,year in BOOKS:
        xhtml=download(base+"open/download?type=xhtml")
        wxr=download(base+"open/download?type=wxr")
        links=official_links(wxr,base)
        chapters,missing=parse(xhtml,links,base,bid)
        data={"id":bid,"title":title,"publisher":"WisTech Open / Open Resources for Nursing (Open RN)",
          "authors":"Julia Brown, editor" if bid=="anatomy" else "Ernstmeyer & Christman","year":year,
          "license":"CC BY-NC-SA 4.0, except where otherwise noted; modified text-only extract" if bid=="anatomy" else "CC BY 4.0, except where otherwise noted; modified text-only extract",
          "license_url":"https://creativecommons.org/licenses/by-nc-sa/4.0/" if bid=="anatomy" else "https://creativecommons.org/licenses/by/4.0/",
          "source_url":base,"official_pdf":base+"open/download?type=pdf",
          "official_epub":base+"open/download?type=epub",
          "modifications":"Publisher XHTML transformed into searchable plain-text chapters. Images, embedded media, captions, layout and interactive activities omitted. Third-party rights are not granted by the general book license.",
          "page_reference":"No PDF page metadata. Cite book, source chapter URL and heading only.",
          "chapters":chapters}
        packed=json.dumps(data,ensure_ascii=False,separators=(",",":")).encode("utf8")
        if len(packed)>MAX_TEXT or len(packed)<125*1024:
            raise ValueError("Unexpected text size for "+bid+": "+str(len(packed)))
        staged[bid]=packed
        catalog["books"].append({"id":bid,"title":title,"chapters":len(chapters),
           "size_bytes":len(packed),"source_url":base,"official_pdf":data["official_pdf"],
           "official_epub":data["official_epub"],"publisher":data["publisher"],
           "year":year,"license":data["license"],"ready":True})
        print("IMPORTED",bid,"chapters",len(chapters),"sections",sum(len(c["sections"]) for c in chapters),
              "text_kb",len(packed)//1024,"missing_exact_urls",len(missing),flush=True)
        time.sleep(0.3)
    # Only publish all requested sources after every completeness check passes.
    for bid,raw in staged.items():
        (OUT/(bid+".json")).write_bytes(raw)
    (OUT/"catalog.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("IMPORT_COMPLETE",len(staged),flush=True)

if __name__=="__main__":
    main()
