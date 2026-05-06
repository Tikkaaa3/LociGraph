import hashlib
import math
from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

# Internal store for document chunks
chunks: Dict[str, dict] = {}

# Similarity threshold for graph edge creation
SIMILARITY_THRESHOLD = 0.6


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
            "edges": {},       # NEW
            "activation": 0.0, # NEW
        }
        chunks[chunk_id] = chunk
        build_graph_connections(chunk)  # NEW
        chunk_results.append(chunk)

    return chunk_results


def get_embedding(text: str, dims: int = 64) -> List[float]:
    """Deterministic mock embedding from text hash."""
    digest = hashlib.md5(text.encode("utf-8")).digest()
    return [(digest[i % len(digest)] / 255.0) * 2 - 1 for i in range(dims)]


def build_graph_connections(new_chunk: dict) -> None:
    """Wire a new memory node into the existing graph via semantic similarity."""
    new_len = len(new_chunk["content"])
    
    for existing_id, existing in chunks.items():
        if existing_id == new_chunk["id"]:
            continue
            
        # Lightweight pre-filter: skip if text lengths differ by more than 50%
        # of the average chunk size, as vastly different chunks rarely exceed threshold.
        if abs(new_len - len(existing["content"])) > 150:
            continue
            
        raw_sim = _cosine_similarity(new_chunk["embedding"], existing["embedding"])
        if raw_sim > SIMILARITY_THRESHOLD:
            weight = (raw_sim + 1) / 2  # normalize cosine → [0, 1]
            new_chunk["edges"][existing_id] = weight
            existing.setdefault("edges", {})[new_chunk["id"]] = weight


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def score_chunk_semantic(query: str, chunk: dict, query_emb: list[float] | None = None) -> float:
    if query_emb is None:
        query_emb = get_embedding(query)
    chunk_emb = chunk["embedding"]
    return _cosine_similarity(query_emb, chunk_emb)


# Hybrid scoring fuses exact lexical overlap with conceptual embedding similarity.
# Keywords anchor results to explicit terms, while embeddings capture synonyms,
# paraphrases, and semantic relatives that keyword counts alone would miss.
# The 0.4 / 0.6 weighting prioritizes semantic meaning without discarding
# the precision of exact keyword matches.
def score_chunk(query: str, chunk: dict, mode: str = "keyword", query_emb: list[float] | None = None) -> float:
    if mode == "semantic":
        return score_chunk_semantic(query, chunk, query_emb)

    keywords = query.lower().split()
    text = chunk["content"].lower()

    if mode == "hybrid":
        # Normalize keyword overlap to [0, 1]
        matches = sum(1 for kw in keywords if kw in text)
        keyword_score = matches / len(keywords) if keywords else 0.0

        # Normalize semantic cosine similarity from [-1, 1] → [0, 1]
        raw_semantic = score_chunk_semantic(query, chunk, query_emb)
        semantic_score = (raw_semantic + 1) / 2

        # Weighted fusion: prioritize semantic meaning (60 %) while preserving keyword signal (40 %)
        return (0.4 * keyword_score) + (0.6 * semantic_score)

    # Legacy keyword mode — unchanged raw-count behavior
    return float(sum(1 for kw in keywords if kw in text))


def _retrieve_scored(
    query: str, mode: str, query_emb: list[float] | None
) -> list[tuple[float, dict]]:
    """Return all chunks with positive scores as (score, chunk) tuples, descending."""
    scored: list[tuple[float, dict]] = []
    for chunk in chunks.values():
        score = score_chunk(query, chunk, mode=mode, query_emb=query_emb)
        if score > 0:
            scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored


def activate_nodes(query: str, top_k: int = 5, hops: int = 2) -> List[dict]:
    """
    Seed node activation via hybrid retrieval, then propagate signals
    across multiple graph hops with decay.
    """
    # FIX 2: Use local activation state instead of mutating global chunks
    activation_state: Dict[str, float] = {}

    # Seed nodes: top-k by hybrid score
    query_emb = get_embedding(query)
    seeds = _retrieve_scored(query, "hybrid", query_emb)[:top_k]

    frontier: list[str] = []
    for score, chunk in seeds:
        activation = min(1.0, max(0.0, score))
        activation_state[chunk["id"]] = activation
        frontier.append(chunk["id"])

    # FIX 4: Multi-hop propagation with bounded hop count (prevents infinite loops)
    for hop in range(1, hops + 1):
        decay = 0.5 ** hop
        next_frontier: set[str] = set()
        for node_id in frontier:
            node = chunks.get(node_id)
            if node is None:
                continue
            current_activation = activation_state.get(node_id, 0.0)
            if current_activation == 0.0:
                continue
            for neighbor_id, weight in node.get("edges", {}).items():
                added = weight * current_activation * decay
                neighbor_activation = activation_state.get(neighbor_id, 0.0)
                new_activation = min(1.0, neighbor_activation + added)
                activation_state[neighbor_id] = new_activation
                next_frontier.add(neighbor_id)
        frontier = list(next_frontier)

    # FIX 5: Normalize activations across the graph
    if activation_state:
        max_activation = max(activation_state.values())
        if max_activation > 0:
            for cid in activation_state:
                activation_state[cid] = min(1.0, activation_state[cid] / max_activation)

    # Build results without mutating stored chunks
    result = []
    for c in chunks.values():
        act = activation_state.get(c["id"], 0.0)
        if act > 0:
            result.append({**c, "activation": act})
    result.sort(key=lambda x: x["activation"], reverse=True)
    return result


def retrieve_documents(query: str, top_k: int = 3, mode: str = "keyword") -> List[dict]:
    """Retrieve top-k chunks. Supports keyword, semantic, hybrid, and graph modes."""
    if not query or not chunks:
        return []

    if mode == "graph":
        activated = activate_nodes(query, top_k=top_k)
        result = []
        for chunk in activated[:top_k]:
            # FIX 3: Create a copy before attaching metadata to prevent mutation
            chunk_copy = dict(chunk)
            top = sorted(
                chunk_copy.get("edges", {}).items(), key=lambda x: x[1], reverse=True
            )[:3]
            chunk_copy["top_neighbors"] = [
                {"id": nid, "weight": round(w, 4)} for nid, w in top
            ]
            result.append(chunk_copy)
        return result

    query_emb = None
    if mode in ("semantic", "hybrid"):
        query_emb = get_embedding(query)
    scored = _retrieve_scored(query, mode, query_emb)
    return [chunk for _, chunk in scored[:top_k]]
