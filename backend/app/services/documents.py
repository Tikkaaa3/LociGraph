from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

documents: Dict[str, dict] = {}

def add_document(content: str) -> dict:
    doc = {
        "id": str(uuid4()),
        "content": content,
        "created_at": datetime.now(timezone.utc),
    }
    documents[doc["id"]] = doc
    return doc

def retrieve_documents(query: str, top_k: int = 3) -> List[dict]:
    if not query or not documents:
        return []

    keywords = set(query.lower().split())
    scored = []

    for doc in documents.values():
        text = doc["content"].lower()
        score = sum(1 for kw in keywords if kw in text)
        if score:
            scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]
