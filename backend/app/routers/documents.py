from fastapi import APIRouter
from pydantic import BaseModel

from ..services.documents import add_document

router = APIRouter(prefix="/documents", tags=["documents"])


class UploadRequest(BaseModel):
    content: str


@router.post("/upload")
def upload_document(body: UploadRequest):
    return add_document(body.content)
