from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

# Internal store for document chunks
chunks: Dict[str, dict] = {}

def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks, preferring word boundaries."""
    if len(text) <= chunk_size:
        return [text]
    
    result = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            # Prefer breaking at whitespace or newline to avoid cutting words
            break_at = text.rfind(' ', start, end)
            if break_at == -1:
                break_at = text.rfind('\n', start, end)
            if break_at != -1 and break_at > start:
                end = break_at + 1
        chunk = text[start:end].strip()
        if chunk:
            result.append(chunk)
        start = end - overlap
    return result

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

def retrieve_documents(query: str, top_k: int = 3) -> List[dict]:
    """Retrieve top-k chunks matching the query keywords."""
    if not query or not chunks:
        return []

    keywords = set(query.lower().split())
    scored = []

    for chunk in chunks.values():
        text = chunk["content"].lower()
        score = sum(1 for kw in keywords if kw in text)
        if score:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
