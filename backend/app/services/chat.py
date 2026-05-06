from typing import List
from datetime import datetime, timezone
from uuid import uuid4

from ..models import MessageResponse, Role


def extract_query(messages: List[MessageResponse]) -> str:
    """Extract the last user message to use as the search query."""
    for m in reversed(messages):
        if m.role == Role.USER:
            return m.content
    return ""


def retrieve_context(query: str) -> List[dict]:
    """Mock retrieval step: returns placeholder documents for the query."""
    # Future: replace with vector DB / embedding search
    return [
        {"id": "doc1", "content": "Python is a programming language."},
        {"id": "doc2", "content": "It is often used for backend development."},
    ]


def build_prompt(messages: List[MessageResponse], retrieved_context: List[dict]) -> str:
    """Combine conversation history and retrieved documents into a prompt string."""
    history_text = "\n".join(f"{m.role.value}: {m.content}" for m in messages)
    docs_text = "\n".join(
        f"- [{doc['id']}] {doc['content']}" for doc in retrieved_context
    )
    return (
        f"Conversation history:\n{history_text}\n\n"
        f"Retrieved documents:\n{docs_text}\n\n"
        "Please answer based on the retrieved documents."
    )


def generate_answer(prompt: str, query: str, retrieved_context: List[dict]) -> str:
    """Produce a deterministic mock answer from the retrieved context."""
    if not retrieved_context:
        return "I couldn't find any relevant documents to answer your question."
    combined = " ".join(doc["content"] for doc in retrieved_context)
    return f"Based on retrieved documents: {combined}"


async def generate_reply(
    conversation_id, messages: List[MessageResponse]
) -> MessageResponse:
    # 1. Extract query
    query = extract_query(messages)
    if not query:
        return MessageResponse(
            id=uuid4(),
            conversation_id=conversation_id,
            role=Role.ASSISTANT,
            content="I'm not sure what you asked. Can you clarify?",
            created_at=datetime.now(timezone.utc),
            sources=[],
        )

    # 2. Retrieve mock context
    retrieved = retrieve_context(query)

    # 3. Build prompt for future LLM use
    prompt = build_prompt(messages, retrieved)

    # 4. Generate deterministic mock answer
    reply_text = generate_answer(prompt, query, retrieved)

    # Attach source IDs for provenance
    sources = [{"id": doc["id"]} for doc in retrieved]

    return MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        role=Role.ASSISTANT,
        content=reply_text,
        created_at=datetime.now(timezone.utc),
        sources=sources,
    )
