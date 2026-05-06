from typing import List
from datetime import datetime, timezone
from uuid import uuid4

from ..models import MessageResponse, Role


async def generate_reply(
    conversation_id, messages: List[MessageResponse]
) -> MessageResponse:
    # Prepare history for future LLM usage
    history = [{"role": m.role.value, "content": m.content} for m in messages]

    # Find last user message
    last_user_content = ""
    for m in reversed(messages):
        if m.role == Role.USER:
            last_user_content = m.content
            break

    if not last_user_content:
        reply_text = "I'm not sure what you asked. Can you clarify?"
    else:
        reply_text = f"You said: {last_user_content}"

    return MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        role=Role.ASSISTANT,
        content=reply_text,
        created_at=datetime.now(timezone.utc),
        sources=[],
    )
