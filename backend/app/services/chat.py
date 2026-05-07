import os
import logging
from typing import List, Tuple
from datetime import datetime, timezone
from uuid import uuid4

from openai import AsyncOpenAI

from ..models import MessageResponse, Role
from .documents import retrieve_documents

logger = logging.getLogger(__name__)

from openai import AsyncOpenAI
import os

client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL"),
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "LociGraph",
    },
)
LLM_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")


# ----------------------------
# Utils
# ----------------------------


def extract_query(messages: List[MessageResponse]) -> str:
    """Extract last user message."""
    for m in reversed(messages):
        if m.role == Role.USER:
            return m.content
    return ""


def retrieve_context(query: str) -> List[dict]:
    return retrieve_documents(query)


# ----------------------------
# Prompt builder (IMPORTANT)
# ----------------------------


def build_rag_prompt(question: str, chunks: List[str]) -> List[dict]:
    context_lines = [f"[{i + 1}] {c}" for i, c in enumerate(chunks)]
    context = "\n".join(context_lines)

    system = (
        "You are a precise and grounded assistant.\n"
        "You MUST only use the provided context.\n"
        "If the answer is not in the context, say: not in provided context."
    )

    user = f"""
CONTEXT CHUNKS:
{context}

RULES:
- You MUST cite chunk numbers like [1], [2]
- Do NOT use external knowledge
- If missing information: say "not in provided context"

QUESTION:
{question}
""".strip()

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


# ----------------------------
# LLM call (clean)
# ----------------------------


async def generate_answer(messages: List[dict]) -> str:
    try:
        response = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=800,
        )

        content = response.choices[0].message.content
        return content.strip() if content else "not in provided context"

    except Exception:
        logger.exception("LLM generation failed")
        return "Error: LLM failed to generate response."


# ----------------------------
# Main pipeline
# ----------------------------


async def generate_reply(
    conversation_id,
    messages: List[MessageResponse],
) -> MessageResponse:

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

    chunks = [doc["content"] for doc in retrieved]

    # build messages properly
    llm_messages = build_rag_prompt(query, chunks)

    reply_text = await generate_answer(llm_messages)

    sources = [{"id": doc["id"]} for doc in retrieved]

    return MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        role=Role.ASSISTANT,
        content=reply_text,
        created_at=datetime.now(timezone.utc),
        sources=sources,
    )
