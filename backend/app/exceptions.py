from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    code: str | None = None


class ChatException(Exception):
    def __init__(self, status_code: int, code: str, detail: str):
        self.status_code = status_code
        self.code = code
        self.detail = detail


class ConversationNotFoundError(ChatException):
    def __init__(self):
        super().__init__(404, "CONVERSATION_NOT_FOUND", "Conversation does not exist.")


def register_exception_handlers(app):
    @app.exception_handler(ChatException)
    async def handle_chat_exception(request: Request, exc: ChatException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(error=exc.code, detail=exc.detail).model_dump(),
        )
