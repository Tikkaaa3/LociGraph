from fastapi import APIRouter
from pydantic import BaseModel

from ..services.documents import add_document, retrieve_documents

router = APIRouter(prefix="/documents", tags=["documents"])


class UploadRequest(BaseModel):
    content: str


@router.post("/upload")
def upload_document(body: UploadRequest):
    return add_document(body.content)


@router.get("/retrieve")
def retrieve_document(q: str, mode: str = "keyword"):
    if not q:
        return []
    return retrieve_documents(q, top_k=5, mode=mode)
