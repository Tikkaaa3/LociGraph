import logging
import re

import fitz
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..services.documents import add_document, retrieve_documents

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)
pdf_router = APIRouter(prefix="/pdf", tags=["pdf"])


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


def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        logger.debug("PDF pages: %d", len(doc))
        pages = [page.get_text() for page in doc]
        text = "\n".join(pages)
        logger.debug("Raw text length: %d", len(text))
        return text
    finally:
        doc.close()


def normalize_text(text: str) -> str:
    text = text.replace("\r", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


@pdf_router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file")

    try:
        text = extract_text_from_pdf(content)
    except Exception as exc:
        logger.error("PDF extraction failed: %s", exc)
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    text = normalize_text(text)
    logger.debug("Cleaned preview: %s", text[:200])
    logger.debug("Final cleaned text length: %d", len(text))

    if not text:
        raise HTTPException(status_code=422, detail="Empty extracted text")

    return add_document(text)
