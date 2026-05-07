import os
import logging
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

from openai import AsyncOpenAI

from ..models import MessageResponse, Role
from .documents import retrieve_documents

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
LLM_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")


def extract_query(messages: List[MessageResponse]) -> str:
    """Extract the last user message to use as the search query."""
    for m in reversed(messages):
        if m.role == Role.USER:
            return m.content
    return ""


def retrieve_context(query: str) -> List[dict]:
    return retrieve_documents(query)


def build_rag_prompt(question: str, chunks: List[str]) -> str:
    """Build structured prompt with numbered context chunks for the LLM."""
    context_lines = [f"[{i + 1}] {text}" for i, text in enumerate(chunks)]
    context_str = "\n".join(context_lines)
    return (
        "SYSTEM:\n"
        "You are a precise and grounded assistant. You must only use the provided context to answer the question.\n\n"
        "CONTEXT CHUNKS:\n"
        f"{context_str}\n\n"
        "RULES:\n"
        "- You MUST cite chunk numbers in your answer (e.g., [1], [2])\n"
        '- If the answer is not contained in the context, say: "not in provided context"\n'
        "- Do not hallucinate or use outside knowledge\n"
        "- Prefer concise and clear answers\n\n"
        f"USER QUESTION:\n{question}"
    )


async def generate_answer(prompt: str) -> str:
    """Send the structured RAG prompt to the LLM and return its response."""
    if not prompt:
        return "I couldn't find any relevant documents to answer your question."

    try:
        response = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        content = response.choices[0].message.content
        return content.strip() if content else "not in provided context"
    except Exception:
        logger.exception("LLM generation failed")
        return "Error: The LLM failed to generate a response."


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

    # 2. Retrieve chunks
    retrieved = retrieve_context(query)
    if not retrieved:
        return MessageResponse(
            id=uuid4(),
            conversation_id=conversation_id,
            role=Role.ASSISTANT,
            content="I couldn't find any relevant documents to answer your question.",
            created_at=datetime.now(timezone.utc),
            sources=[],
        )

    # 3. Build structured RAG prompt
    prompt = build_rag_prompt(query, [doc["content"] for doc in retrieved])

    # 4. Generate answer via LLM
    reply_text = await generate_answer(prompt)

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
