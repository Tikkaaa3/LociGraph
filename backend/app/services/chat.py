import random
from datetime import datetime, timezone
from uuid import uuid4

from ..models import MessageResponse, Role


async def generate_reply(conversation_id, content: str) -> MessageResponse:
    # MOCK: Replace with real LLM / RAG pipeline
    replies = [
        "Can you elaborate on that?",
        "Here's a possible approach...",
        "That makes sense. What else?",
        "Could you clarify your question?",
    ]
    return MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        role=Role.ASSISTANT,
        content=random.choice(replies),
        created_at=datetime.now(timezone.utc),
        sources=[],
    )
