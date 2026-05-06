from datetime import datetime, timezone
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, status

from .. import models
from ..exceptions import ConversationNotFoundError
from ..services.chat import generate_reply

router = APIRouter(prefix="/conversations", tags=["conversations"])

# TODO: Replace with persistent store / DB layer
_conversations: dict[UUID, dict] = {}
_messages: dict[UUID, List[models.MessageResponse]] = {}


def _ensure_conversation(conversation_id: UUID) -> None:
    if conversation_id not in _conversations:
        raise ConversationNotFoundError()


@router.get("", response_model=List[models.ConversationResponse])
def list_conversations():
    result = []
    for cid, cdata in _conversations.items():
        result.append(
            models.ConversationResponse(
                id=cid,
                title=cdata.get("title"),
                created_at=cdata["created_at"],
                updated_at=cdata["updated_at"],
                message_count=len(_messages.get(cid, [])),
            )
        )
    return sorted(result, key=lambda x: x.updated_at, reverse=True)


@router.post("", response_model=models.ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(body: models.ConversationCreate):
    now = datetime.now(timezone.utc)
    cid = uuid4()
    _conversations[cid] = {"title": body.title, "created_at": now, "updated_at": now}
    _messages[cid] = []
    return models.ConversationResponse(
        id=cid, title=body.title, created_at=now, updated_at=now, message_count=0
    )


@router.get("/{conversation_id}", response_model=models.ConversationResponse)
def get_conversation(conversation_id: UUID):
    _ensure_conversation(conversation_id)
    c = _conversations[conversation_id]
    return models.ConversationResponse(
        id=conversation_id,
        title=c.get("title"),
        created_at=c["created_at"],
        updated_at=c["updated_at"],
        message_count=len(_messages.get(conversation_id, [])),
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: UUID):
    _ensure_conversation(conversation_id)
    _conversations.pop(conversation_id, None)
    _messages.pop(conversation_id, None)
    return None


@router.get("/{conversation_id}/messages", response_model=List[models.MessageResponse])
def list_messages(conversation_id: UUID):
    _ensure_conversation(conversation_id)
    return sorted(_messages.get(conversation_id, []), key=lambda m: m.created_at)


@router.post(
    "/{conversation_id}/messages",
    response_model=models.MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(conversation_id: UUID, body: models.MessageCreate):
    _ensure_conversation(conversation_id)
    now = datetime.now(timezone.utc)

    user_msg = models.MessageResponse(
        id=uuid4(),
        conversation_id=conversation_id,
        role=body.role,
        content=body.content,
        created_at=now,
    )
    _messages[conversation_id].append(user_msg)

    # Pass full conversation history (oldest → newest)
    assistant_msg = await generate_reply(conversation_id, _messages[conversation_id])
    _messages[conversation_id].append(assistant_msg)
    _conversations[conversation_id]["updated_at"] = assistant_msg.created_at

    return assistant_msg
