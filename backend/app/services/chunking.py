import logging
import math
from typing import List

import spacy
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# NOTE: run `python -m spacy download en_core_web_sm` before first use
_nlp = spacy.load("en_core_web_sm")
_encoder = SentenceTransformer("all-MiniLM-L6-v2")

MIN_SENTENCES = 3
MAX_TOKENS_APPROX = 500


def compute_similarities(embeddings: List) -> List[float]:
    """Compute cosine similarity between consecutive sentence embeddings."""
    similarities = []
    for i in range(len(embeddings) - 1):
        sim = cosine_similarity([embeddings[i]], [embeddings[i + 1]])[0][0]
        similarities.append(float(sim))
    return similarities


def dynamic_threshold(similarities: List[float]) -> float:
    """Compute mean - 0.5 * std as the split threshold."""
    if not similarities:
        return 0.0
    mean = sum(similarities) / len(similarities)
    variance = sum((s - mean) ** 2 for s in similarities) / len(similarities)
    std = math.sqrt(variance)
    threshold = mean - 0.5 * std
    logger.debug(
        "Similarities: n=%d mean=%.4f std=%.4f threshold=%.4f",
        len(similarities), mean, std, threshold
    )
    return threshold


def semantic_chunk_text(text: str) -> List[str]:
    """Split text into semantically coherent chunks using sentence embeddings."""
    doc = _nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    logger.debug("Number of sentences: %d", len(sentences))

    if len(sentences) < MIN_SENTENCES:
        logger.debug(
            "Sentences %d < %d, returning full text as one chunk",
            len(sentences), MIN_SENTENCES
        )
        return [text.strip()] if text.strip() else []

    embeddings = _encoder.encode(sentences, convert_to_numpy=True)
    similarities = compute_similarities(embeddings)
    logger.debug("First few similarities: %s", similarities[:5])
    threshold = dynamic_threshold(similarities)
    logger.debug("Threshold: %.4f", threshold)

    chunks: List[str] = []
    current_chunk: List[str] = [sentences[0]]

    for i in range(1, len(sentences)):
        sent = sentences[i]
        prev_sim = similarities[i - 1]

        current_token_count = len(" ".join(current_chunk).split())
        force_split = current_token_count >= MAX_TOKENS_APPROX

        if force_split or (prev_sim < threshold and len(current_chunk) >= MIN_SENTENCES):
            chunks.append(" ".join(current_chunk))
            current_chunk = [sent]
        else:
            current_chunk.append(sent)

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    logger.debug("Number of chunks produced: %d", len(chunks))
    return chunks
