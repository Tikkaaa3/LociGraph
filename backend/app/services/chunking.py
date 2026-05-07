import logging
import numpy as np
import spacy
from typing import List
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)
_nlp = spacy.load("en_core_web_sm")
_encoder = SentenceTransformer("all-MiniLM-L6-v2")

# ---------------- CONFIG ----------------
MIN_SENTENCES = 3  # don't split until a chunk has at least this many sentences
MAX_CHUNK_SIZE = 10  # hard ceiling (raised — let semantic signal do the work)
MIN_CHUNK_WORDS = 20  # post-pass: merge chunks shorter than this into their neighbour
SIMILARITY_THRESHOLD = 0.45  # sim below this is "suspicious"
HARD_RESET = 0.20  # sim below this always splits (true topic break)
ROLLING_WINDOW = 3  # how many recent embeddings to weight the centroid toward
CONFIRM_SPLIT = True  # require 2 consecutive low-sim sentences before splitting


# ---------------- HELPERS ----------------
def rolling_centroid(all_embs: list, window: int = ROLLING_WINDOW):
    """
    Weighted centroid: recent sentences count more than old ones.
    This prevents early sentences from anchoring the chunk forever.
    """
    arr = np.array(all_embs)
    n = len(arr)
    # linear ramp: oldest sentence weight=1, newest=n
    weights = np.arange(1, n + 1, dtype=float)
    # clip so only the last `window` sentences get the ramp boost
    if n > window:
        weights[: n - window] = weights[n - window]
    weights /= weights.sum()
    return (arr * weights[:, None]).sum(axis=0, keepdims=True)


def cosine(a, b):
    return float(cosine_similarity(a, b)[0][0])


def merge_short_chunks(
    chunks: List[str], min_words: int = MIN_CHUNK_WORDS
) -> List[str]:
    """
    Post-processing pass: any chunk below `min_words` gets merged into whichever
    neighbour is semantically closer (or just the previous one if it's the first chunk).
    This cleans up stub fragments produced by short, noisy sentences.
    Iterates until no undersized chunks remain (handles cascading merges).
    """
    if len(chunks) <= 1:
        return chunks

    embs = list(_encoder.encode(chunks, convert_to_numpy=True))
    texts = list(chunks)

    changed = True
    while changed:
        changed = False
        i = 0
        while i < len(texts):
            if len(texts[i].split()) >= min_words or len(texts) == 1:
                i += 1
                continue

            # choose neighbour: closest by cosine, fallback to prev/next boundary
            if i == 0:
                nb = 1
            elif i == len(texts) - 1:
                nb = i - 1
            else:
                sim_prev = cosine([embs[i]], [embs[i - 1]])
                sim_next = cosine([embs[i]], [embs[i + 1]])
                nb = i - 1 if sim_prev >= sim_next else i + 1

            lo, hi = min(i, nb), max(i, nb)
            merged_text = texts[lo] + " " + texts[hi]
            merged_emb = np.mean([embs[lo], embs[hi]], axis=0)

            texts[lo] = merged_text
            embs[lo] = merged_emb
            del texts[hi]
            del embs[hi]

            changed = True
            # re-examine position lo (don't advance i)
            i = lo

    return texts


# ---------------- CORE ----------------
def semantic_chunk_text(text: str) -> List[str]:
    print("\n🔥 SEMANTIC CHUNKING START 🔥")
    doc = _nlp(text)
    sentences = [s.text.strip() for s in doc.sents if s.text.strip()]
    logger.debug(f"SENTENCES: {len(sentences)}")

    if len(sentences) <= 1:
        return sentences

    embeddings = _encoder.encode(sentences, convert_to_numpy=True)

    chunks: List[str] = []
    current_sents: List[str] = []
    current_embs: List[np.ndarray] = []
    pending_split = False  # True after one low-sim sentence (CONFIRM_SPLIT mode)
    pending_sent = None
    pending_emb = None

    def flush():
        if current_sents:
            chunks.append(" ".join(current_sents))

    for i, sent in enumerate(sentences):
        emb = embeddings[i]

        # ── seed the first chunk ──────────────────────────────────────────────
        if not current_embs:
            current_sents.append(sent)
            current_embs.append(emb)
            continue

        centroid = rolling_centroid(current_embs)
        sim = cosine([emb], centroid)
        size = len(current_sents)

        logger.debug(
            f"i={i:3d}  sim={sim:.3f}  size={size:2d}  pending={pending_split}"
            f"  text={sent[:50]}"
        )

        # ── hard ceiling ─────────────────────────────────────────────────────
        if size >= MAX_CHUNK_SIZE:
            flush()
            current_sents = [sent]
            current_embs = [emb]
            pending_split = False
            pending_sent = pending_emb = None
            continue

        # ── absolute topic break — split immediately, no confirmation needed ──
        if sim < HARD_RESET:
            if pending_split:  # flush pending outlier with old chunk
                current_sents.append(pending_sent)
                current_embs.append(pending_emb)
            flush()
            current_sents = [sent]
            current_embs = [emb]
            pending_split = False
            pending_sent = pending_emb = None
            continue

        # ── soft threshold — need confirmation before splitting ───────────────
        if sim < SIMILARITY_THRESHOLD and size >= MIN_SENTENCES:
            if not CONFIRM_SPLIT:
                # immediate split mode (set CONFIRM_SPLIT=False to restore old behavior)
                flush()
                current_sents = [sent]
                current_embs = [emb]
                continue

            if pending_split:
                # second low-sim sentence in a row → confirmed topic shift
                flush()
                current_sents = [pending_sent, sent]
                current_embs = [pending_emb, emb]
                pending_split = False
                pending_sent = pending_emb = None
            else:
                # first low-sim sentence → hold it, wait for next to decide
                pending_split = True
                pending_sent = sent
                pending_emb = emb
            continue

        # ── sentence fits in current chunk ───────────────────────────────────
        if pending_split:
            # the held sentence turned out to be a transition, not a break — absorb both
            current_sents.append(pending_sent)
            current_embs.append(pending_emb)
            pending_split = False
            pending_sent = pending_emb = None

        current_sents.append(sent)
        current_embs.append(emb)

    # flush any held pending sentence and the last chunk
    if pending_split:
        current_sents.append(pending_sent)
        current_embs.append(pending_emb)
    flush()

    logger.debug(f"TOTAL CHUNKS (pre-merge): {len(chunks)}")
    chunks = merge_short_chunks(chunks)
    logger.debug(f"TOTAL CHUNKS (post-merge): {len(chunks)}")

    for idx, chunk in enumerate(chunks):
        preview = chunk[:120].replace("\n", " ")
        ellipsis = "..." if len(chunk) > 120 else ""
        logger.debug(
            f"\n{'─' * 60}"
            f"\nCHUNK {idx + 1}/{len(chunks)}  ({len(chunk.split())} words)"
            f"\n{preview}{ellipsis}"
            f"\n{'─' * 60}"
        )

    return chunks
