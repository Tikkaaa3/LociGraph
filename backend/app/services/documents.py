import logging
import math
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
from typing import Dict, List
from uuid import uuid4

from .chunking import semantic_chunk_text, _encoder

# Internal store for document chunks
chunks: Dict[str, dict] = {}

# Similarity threshold for graph edge creation
# Real sentence-transformer cosine similarities between topically distinct chunks
# typically land in [0.2, 0.5] — 0.6 was calibrated for the MD5 mock and is too high.
SIMILARITY_THRESHOLD = 0.30

# Activation config
# T=4.0 was collapsing (0.73, 0.50, 0.46) → (0.35, 0.33, 0.32) — nearly uniform.
# T=0.5 produces sharp separation: the best chunk dominates, weak ones drop steeply.
ACTIVATION_SEED_TEMPERATURE = 0.5
ACTIVATION_HOP_DECAY = 0.6  # base per-hop decay (multiplied by edge weight)
ACTIVATION_MIN_PROPAGATE = 0.05  # don't propagate from nodes below this activation


def add_document(content: str) -> List[dict]:
    """Chunk the document content and store each chunk."""
    doc_id = str(uuid4())
    created_at = datetime.now(timezone.utc)
    text_chunks = semantic_chunk_text(content)

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
            "edges": {},
            "activation": 0.0,
        }
        chunks[chunk_id] = chunk
        build_graph_connections(chunk)
        chunk_results.append(chunk)

    return chunk_results


def get_embedding(text: str) -> List[float]:
    """Real semantic embedding via the shared sentence-transformer model."""
    return _encoder.encode(text, convert_to_numpy=True).tolist()


def clear_documents() -> None:
    """Wipe all stored chunks. Call before re-ingesting the same document."""
    chunks.clear()
    logger.debug("Document store cleared.")


def build_graph_connections(new_chunk: dict) -> None:
    """Wire a new memory node into the existing graph via semantic similarity."""
    for existing_id, existing in chunks.items():
        # skip self — check both id and doc_id+index to guard against duplicate ingestion
        if existing_id == new_chunk["id"]:
            continue
        if (
            existing["doc_id"] == new_chunk["doc_id"]
            and existing["chunk_index"] == new_chunk["chunk_index"]
        ):
            continue

        raw_sim = _cosine_similarity(new_chunk["embedding"], existing["embedding"])
        if raw_sim > SIMILARITY_THRESHOLD:
            weight = (raw_sim + 1) / 2  # normalize cosine → [0, 1]
            new_chunk["edges"][existing_id] = weight
            existing.setdefault("edges", {})[new_chunk["id"]] = weight
            logger.debug(
                f"  EDGE  {new_chunk['id'][:8]} ↔ {existing_id[:8]}"
                f"  sim={raw_sim:.3f}  weight={weight:.3f}"
            )


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def score_chunk_semantic(
    query: str, chunk: dict, query_emb: list[float] | None = None
) -> float:
    if query_emb is None:
        query_emb = get_embedding(query)
    return _cosine_similarity(query_emb, chunk["embedding"])


# Hybrid scoring fuses exact lexical overlap with conceptual embedding similarity.
# Keywords anchor results to explicit terms, while embeddings capture synonyms,
# paraphrases, and semantic relatives that keyword counts alone would miss.
# The 0.4 / 0.6 weighting prioritizes semantic meaning without discarding
# the precision of exact keyword matches.
def score_chunk(
    query: str, chunk: dict, mode: str = "keyword", query_emb: list[float] | None = None
) -> float:
    if mode == "semantic":
        return score_chunk_semantic(query, chunk, query_emb)

    keywords = query.lower().split()
    text = chunk["content"].lower()

    if mode == "hybrid":
        matches = sum(1 for kw in keywords if kw in text)
        keyword_score = matches / len(keywords) if keywords else 0.0

        raw_semantic = score_chunk_semantic(query, chunk, query_emb)
        semantic_score = (raw_semantic + 1) / 2

        return (0.4 * keyword_score) + (0.6 * semantic_score)

    # Legacy keyword mode
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


def _softmax(scores: list[float], temperature: float = 1.0) -> list[float]:
    """
    Softmax with temperature over a list of raw scores.
    Higher temperature → flatter distribution (more chunks get meaningful activation).
    Lower temperature → winner-takes-most (top chunk dominates).
    """
    if not scores:
        return []
    scaled = [s / temperature for s in scores]
    max_s = max(scaled)  # numerical stability
    exps = [math.exp(s - max_s) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def activate_nodes(query: str, top_k: int = 5, hops: int = 2) -> List[dict]:
    logger.debug(f"\n{'═' * 60}\nACTIVATE NODES  query={query!r}\n{'═' * 60}")

    activation_state: Dict[str, float] = {}

    query_emb = get_embedding(query)
    all_scored = _retrieve_scored(query, "hybrid", query_emb)
    seeds = all_scored[:top_k]

    if not seeds:
        return []

    logger.debug("── RAW HYBRID SCORES (all chunks) ──")
    for score, chunk in all_scored:
        preview = chunk["content"][:60].replace("\n", " ")
        logger.debug(f"  score={score:.4f}  {preview!r}")

    raw_scores = [score for score, _ in seeds]
    seed_activations = _softmax(raw_scores, temperature=ACTIVATION_SEED_TEMPERATURE)

    logger.debug(f"\n── SEED ACTIVATIONS (softmax T={ACTIVATION_SEED_TEMPERATURE}) ──")
    frontier: list[str] = []
    for activation, (raw, chunk) in zip(seed_activations, seeds):
        preview = chunk["content"][:60].replace("\n", " ")
        logger.debug(
            f"  raw={raw:.4f} → softmax={activation:.4f}"
            f"  edges={len(chunk.get('edges', {}))}"
            f"  {preview!r}"
        )
        activation_state[chunk["id"]] = activation
        frontier.append(chunk["id"])

    seed_ids = set(activation_state.keys())  # ← freeze seed set before hopping

    for hop in range(1, hops + 1):
        logger.debug(f"\n── HOP {hop}  frontier_size={len(frontier)} ──")
        next_frontier: set[str] = set()
        hop_scale = ACTIVATION_HOP_DECAY**hop  # ← compounds per hop

        for node_id in frontier:
            node = chunks.get(node_id)
            if node is None:
                continue
            current_activation = activation_state.get(node_id, 0.0)
            if current_activation < ACTIVATION_MIN_PROPAGATE:
                continue

            for neighbor_id, weight in node.get("edges", {}).items():
                if neighbor_id in seed_ids:  # ← don't re-inflate seeds
                    continue
                effective_decay = hop_scale * weight
                added = current_activation * effective_decay
                prev = activation_state.get(neighbor_id, 0.0)
                new_val = min(1.0, max(prev, added))  # ← max, not sum
                activation_state[neighbor_id] = new_val
                next_frontier.add(neighbor_id)
                logger.debug(
                    f"  {node_id[:8]} → {neighbor_id[:8]}"
                    f"  edge_w={weight:.3f}  decay={effective_decay:.3f}"
                    f"  added={added:.4f}  activation: {prev:.4f} → {new_val:.4f}"
                )
        frontier = list(next_frontier)

    # normalise
    logger.debug("\n── PRE-NORMALISATION ACTIVATIONS ──")
    for cid, act in sorted(activation_state.items(), key=lambda x: -x[1]):
        preview = chunks.get(cid, {}).get("content", "")[:60].replace("\n", " ")
        logger.debug(f"  {cid[:8]}  act={act:.4f}  {preview!r}")

    if activation_state:
        max_act = max(activation_state.values())
        if max_act > 0:
            for cid in activation_state:
                activation_state[cid] = round(activation_state[cid] / max_act, 4)

    logger.debug("\n── FINAL ACTIVATIONS ──")
    result = []
    for c in chunks.values():
        act = activation_state.get(c["id"], 0.0)
        if act > 0:
            preview = c["content"][:60].replace("\n", " ")
            logger.debug(f"  {act * 100:.1f}%  {preview!r}")
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
