import logging
import math
from typing import List

import spacy
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

_nlp = spacy.load("en_core_web_sm")
_encoder = SentenceTransformer("all-MiniLM-L6-v2")

MIN_SENTENCES = 2
WINDOW_SIZE = 4

HARD_BREAK = 0.05
BASE_THRESHOLD = 0.08
CONFIRM_STEPS = 2


def compute_similarities(embeddings):
    return [
        float(cosine_similarity([embeddings[i]], [embeddings[i + 1]])[0][0])
        for i in range(len(embeddings) - 1)
    ]


def rolling_mean(values):
    return sum(values) / len(values) if values else 1.0


def semantic_chunk_text(text: str) -> List[str]:
    print("\n🔥 SEMANTIC CHUNKING START 🔥")

    doc = _nlp(text)
    sentences = [s.text.strip() for s in doc.sents if s.text.strip()]

    logger.debug(f"SENTENCES: {len(sentences)}")

    embeddings = _encoder.encode(sentences, convert_to_numpy=True)

    sims = compute_similarities(embeddings)

    chunks = []
    current = [sentences[0]]
    window = []

    pending_split = 0  # stability buffer

    for i in range(1, len(sentences)):
        sim = sims[i - 1]

        window.append(sim)
        if len(window) > WINDOW_SIZE:
            window.pop(0)

        local = rolling_mean(window)
        drift = local - sim

        # 🧠 stable scoring
        split_score = 0

        if sim < local * 0.65:
            split_score += 1
        if sim < BASE_THRESHOLD:
            split_score += 1
        if drift > 0.10:
            split_score += 1

        should_split = split_score >= 2 and len(current) >= MIN_SENTENCES

        # 🛡 stability gate (prevents flickering splits)
        if should_split:
            pending_split += 1
        else:
            pending_split = 0

        logger.debug(
            f"i={i} sim={sim:.3f} local={local:.3f} drift={drift:.3f} score={split_score} pending={pending_split}"
        )

        if pending_split >= CONFIRM_STEPS:
            logger.debug("➡️ SPLIT CONFIRMED")

            chunks.append(" ".join(current))
            current = [sentences[i]]
            window = []
            pending_split = 0
        else:
            current.append(sentences[i])

    if current:
        chunks.append(" ".join(current))

    logger.debug(f"TOTAL CHUNKS: {len(chunks)}")

    return chunks
