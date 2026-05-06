from typing import List
from datetime import datetime, timezone
from uuid import uuid4

from ..models import MessageResponse, Role


async def generate_reply(conversation_id, messages: List[MessageResponse]) -> MessageResponse:
    # History payload ready for future LLM use
    history = [{"role": m.role.value, "content": m.content} for m in messages]

    # Deterministically pick reply based on last user message
    last_user_content = ""
    for m in reversed(messages):
        if m.role == Role.USER:
            last_user_content = m.content
            break

    replies = [
        "Can you elaborate on that?",
        "Here's a possible approach...",
        "That makes sense. What else?",
        "Could you clarify your question?",
    ]
    idx = sum(ord(c) for c in last_user_content) % len(replies)

    return MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        role=Role.ASSISTANT,
        content=replies[idx],
        created_at=datetime.now(timezone.utc),
        sources=[],
    )
