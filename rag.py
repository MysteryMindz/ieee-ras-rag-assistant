"""Small, dependency-free BM25-style retriever used by the Streamlit app."""
from __future__ import annotations
import json, math, re
from pathlib import Path

STOP = set("a an and are as at be by for from has have how i in is it its of on or that the their this to was what when where which who will with you your".split())
EXPANSIONS = {
    "mission": "objective vision advance foster", "student": "students sac education career networking",
    "publication": "publications journal magazine transactions letters", "conference": "conferences icra iros case workshop",
    "vit": "chennai vitchennai student branch rascade", "standard": "standards standardization scsa",
    "member": "membership members join benefits",
}

def tokenize(text: str) -> list[str]:
    return [t for t in re.sub(r"[^a-z0-9\s-]", " ", text.lower()).split() if len(t) > 1 and t not in STOP]

def expand_query(query: str) -> list[str]:
    terms = tokenize(query)
    low = query.lower()
    for key, words in EXPANSIONS.items():
        if key in low:
            terms.extend(tokenize(words))
    return terms

def load_kb(path: str | Path = "dist/data/kb.json") -> list[dict]:
    return json.loads(Path(path).read_text(encoding="utf-8"))

def retrieve(query: str, documents: list[dict], k: int = 4) -> list[dict]:
    q = expand_query(query); n = len(documents); df: dict[str, int] = {}
    for doc in documents:
        terms = set(tokenize(f"{doc['title']} {doc['text']} {' '.join(doc.get('tags', []))}"))
        for term in terms: df[term] = df.get(term, 0) + 1
    scored = []
    for doc in documents:
        body, title, tags = tokenize(doc["text"]), tokenize(doc["title"]), tokenize(" ".join(doc.get("tags", [])))
        counts = {t: body.count(t) for t in set(body)}; score = 0.0
        for term in q:
            idf = math.log(1 + (n - df.get(term, 0) + .5) / (df.get(term, 0) + .5))
            tf = counts.get(term, 0); bm25 = tf * 2.2 / (tf + 1.2 * (.25 + .75 * len(body) / 85)) if tf else 0
            score += idf * (bm25 + (2.4 if term in title else 0) + (1.7 if term in tags else 0))
        if score > 0: scored.append({**doc, "score": score})
    scored.sort(key=lambda d: d["score"], reverse=True)
    max_score = scored[0]["score"] if scored else 1
    for doc in scored: doc["relevance"] = round(100 * doc["score"] / max_score)
    return scored[:k]

def build_prompt(question: str, hits: list[dict]) -> str:
    context = "\n".join(f"[{i}] {h['title']}: {h['text']}" for i, h in enumerate(hits, 1))
    return ("Answer using only the context. Be concise and factual. If the context does not contain the answer, say so. "
            "Do not invent dates, people, events, fees, or links.\n\nContext:\n" + context + f"\n\nQuestion: {question}\nAnswer:")

def extractive_answer(question: str, hits: list[dict]) -> str:
    if not hits:
        return "I could not find support for that in the current knowledge base. Try asking about the IEEE RAS mission, membership, students, publications, conferences, standards, or VIT Chennai."
    q = set(expand_query(question)); candidates = []
    for rank, hit in enumerate(hits):
        for sentence in re.split(r"(?<=[.!?])\s+", hit["text"]):
            candidates.append((sum(t in q for t in tokenize(sentence)), -rank, sentence))
    candidates.sort(reverse=True)
    return " ".join(item[2] for item in candidates[:3])
