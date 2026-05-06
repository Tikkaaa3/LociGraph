import hashlib
import math
from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

# Internal store for document chunks
chunks: Dict[str, dict] = {}


def _chunk_text(text: str, chunk_size: int = 300) -> List[str]:
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def add_document(content: str) -> List[dict]:
    """Chunk the document content and store each chunk."""
    doc_id = str(uuid4())
    created_at = datetime.now(timezone.utc)
    text_chunks = _chunk_text(content)

    chunk_results = []
    for i, chunk_content in enumerate(text_chunks):
        chunk_id = f"{doc_id}_chunk_{i}"
        chunk = {
            "id": chunk_id,
            "doc_id": doc_id,
            "content": chunk_content,
            "embedding": get_embedding(chunk_content),
            "created_at": created_at,
            "chunk_index": i,
        }
        chunks[chunk_id] = chunk
        chunk_results.append(chunk)

    return chunk_results


def get_embedding(text: str, dims: int = 64) -> List[float]:
    """Deterministic mock embedding from text hash."""
    digest = hashlib.md5(text.encode("utf-8")).digest()
    return [(digest[i % len(digest)] / 255.0) * 2 - 1 for i in range(dims)]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def score_chunk_semantic(query: str, chunk: dict) -> float:
    query_emb = get_embedding(query)
    chunk_emb = chunk["embedding"]
    return _cosine_similarity(query_emb, chunk_emb)


def score_chunk(query: str, chunk: dict, mode: str = "keyword") -> float:
    if mode == "semantic":
        return score_chunk_semantic(query, chunk)
    keywords = query.lower().split()
    text = chunk["content"].lower()
    return float(sum(1 for kw in keywords if kw in text))


def retrieve_documents(query: str, top_k: int = 3, mode: str = "keyword") -> List[dict]:
    """Retrieve top-k chunks matching the query keywords."""
    if not query or not chunks:
        return []

    scored = []

    for chunk in chunks.values():
        score = score_chunk(query, chunk, mode=mode)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
