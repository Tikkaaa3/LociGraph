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
            "created_at": created_at,
            "chunk_index": i,
        }
        chunks[chunk_id] = chunk
        chunk_results.append(chunk)

    return chunk_results


def score_chunk(query: str, chunk: dict) -> int:
    # Future: replace score_chunk with embedding similarity function
    keywords = query.lower().split()
    text = chunk["content"].lower()
    return sum(1 for kw in keywords if kw in text)


def retrieve_documents(query: str, top_k: int = 3) -> List[dict]:
    """Retrieve top-k chunks matching the query keywords."""
    if not query or not chunks:
        return []

    scored = []

    for chunk in chunks.values():
        score = score_chunk(query, chunk)
        if score:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
