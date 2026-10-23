#!/usr/bin/env python3
"""Pull the three official Open RN WXR exports, copy text only, preserve source links.

Private single-student proof app. Images, media and embeds (potential third-party
copyright exceptions) are deliberately excluded. No user PDF uploads required.
"""
import json, re, time, urllib.request
from pathlib import Path
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

BOOKS = [
 ("fundamentals", "Nursing Fundamentals 2e", "https://wtcs.pressbooks.pub/nursingfundamentals/", 2024),
 ("skills", "Nursing Skills 2e", "https://wtcs.pressbooks.pub/nursingskills/", 2023),
 ("terminology", "Medical Terminology 2e", "https://wtcs.pressbooks.pub/medterm/", 2024),
]
OUT = Path("data/books")
MAX_WXR = 20*1024*1024
MAX_TEXT = 12*1024*1024
WP = "{http://wordpress.org/export/1.2/}"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}"
SKIP = {"script","style","figure","figcaption","iframe","video","audio","svg","object","embed","canvas","noscript"}

def normal(value):
    return re.sub(r"\s+", " ", value or "").strip()

class ChapterParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks=[]
        self.capturing=None
        self.buffer=[]
        self.depth=0
    def handle_starttag(self, tag, attrs):
        tag=tag.lower()
        if tag in SKIP:
            self.depth+=1
            return
        if self.depth:
            return
        if tag in ("h1","h2","h3","h4","p","dt","dd") and self.capturing is None:
            self.capturing=tag
            self.buffer=[]
    def handle_endtag(self,tag):
        tag=tag.lower()
        if tag in SKIP:
            if self.depth:self.depth-=1
            return
        if self.depth:
            return
        if self.capturing == tag:
            text=normal("".join(self.buffer))
            if len(text)>14 and not text.lower().startswith(("figure ", "image:", "video:", "copyright ©")):
                self.blocks.append((tag,text[:5000]))
            self.capturing=None
            self.buffer=[]
    def handle_data(self,data):
        if not self.depth and self.capturing:
            self.buffer.append(data)

def get_wxr(base):
    url=base+"open/download?type=wxr"
    req=urllib.request.Request(url,headers={"User-Agent":"NandiniNursingStudy/0.2 (educational source text import)"})
    with urllib.request.urlopen(req,timeout=80) as r:
        if int(r.headers.get("Content-Length") or 0)>MAX_WXR:
            raise ValueError("WXR exceeds size limit")
        data=r.read(MAX_WXR+1)
        if len(data)>MAX_WXR or not data.lstrip().startswith(b"<?xml"):
            raise ValueError("Invalid Pressbooks XML")
    return data

def parse(data,bid,base):
    root=ET.fromstring(data)
    out=[]
    skipped=0
    for item in root.findall("./channel/item"):
        if item.findtext(WP+"post_type")!="chapter" or item.findtext(WP+"status")!="publish":
            continue
        title=normal(item.findtext("title")) or "Untitled chapter"
        url=normal(item.findtext("link"))
        if not url.startswith(base):
            continue
        # Prefer publisher book-level license, but NEVER import chapters
        # explicitly flagged under a restrictive separate chapter license.
        meta={}
        for p in item.findall(WP+"postmeta"):
            key=p.findtext(WP+"meta_key") or ""
            value=p.findtext(WP+"meta_value") or ""
            meta[key]=value
        own_license=(meta.get("pb_section_license") or meta.get("pb_chapter_license") or "").lower().strip()
        if own_license and own_license not in ("cc-by","cc-by-4.0","cc0","public-domain","cc-by-sa",""):
            skipped+=1
            continue
        html=item.findtext(CONTENT+"encoded") or ""
        if not html.strip():
            continue
        p=ChapterParser()
        p.feed(html)
        sections=[]
        curr={"heading": title, "paragraphs":[]}
        def append():
            if curr["paragraphs"]:
                text="\n\n".join(curr["paragraphs"])
                if len(text)>35:
                    sections.append({"heading":curr["heading"],"text":text})
        for tag,block in p.blocks:
            if tag.startswith("h"):
                append()
                curr={"heading":block[:180],"paragraphs":[]}
            else:
                curr["paragraphs"].append(block)
        append()
        if not sections:
            continue
        out.append({"id":bid+"-"+str(len(out)+1),"title":title,
                    "url":url,"sections":sections})
    if len(out)<8:raise ValueError("Very few extracted chapters: "+str(len(out)))
    return out,skipped

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    catalog={"schema":1,"books":[]}
    staged={}
    for bid,title,url,year in BOOKS:
        raw=get_wxr(url)
        chapters,skipped=parse(raw,bid,url)
        doc={"id":bid,"title":title,"publisher":"WisTech Open / Open Resources for Nursing (Open RN)",
             "authors":"Ernstmeyer & Christman","year":year,
             "license":"CC BY 4.0, except where otherwise noted; text-only transformation",
             "license_url":"https://creativecommons.org/licenses/by/4.0/",
             "source_url":url,
             "official_pdf":url+"open/download?type=pdf",
             "official_epub":url+"open/download?type=epub",
             "modifications":"Converted official Pressbooks XML chapter HTML to plain text, removed all images, embeds and layouts. Chapters flagged with restricted individual licenses omitted.",
             "page_reference":"Cite publisher chapter URL/section; PDF pages were not extracted.",
             "chapters":chapters}
        content=json.dumps(doc,ensure_ascii=False,separators=(",",":")).encode("utf-8")
        if len(content)>MAX_TEXT:
            raise ValueError("Text index exceeded cap "+bid)
        staged[bid]=content
        catalog["books"].append({"id":bid,"title":title,"chapters":len(chapters),
            "size_bytes":len(content),"source_url":url,"official_pdf":doc["official_pdf"],
            "official_epub":doc["official_epub"],"publisher":doc["publisher"],
            "year":year,"license":doc["license"],"ready":True})
        print("IMPORTED",bid,"wxr_kb",len(raw)//1024,"chapters",len(chapters),
              "sections",sum(len(x["sections"]) for x in chapters),"index_kb",len(content)//1024,
              "skipped_restricted",skipped,flush=True)
        time.sleep(0.4)
    for bid,content in staged.items():
        (OUT/(bid+".json")).write_bytes(content)
    (OUT/"catalog.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("IMPORT_COMPLETE",len(catalog["books"]),flush=True)

if __name__=="__main__":
    main()
