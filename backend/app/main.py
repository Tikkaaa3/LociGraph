from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .exceptions import register_exception_handlers
from .routers.conversations import router as conversations_router
from .routers.documents import pdf_router, router as documents_router

app = FastAPI(title="LociGraph")

import logging

logging.basicConfig(
    level=logging.DEBUG,
    force=True,  # IMPORTANT: overrides uvicorn defaults
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(conversations_router)
app.include_router(documents_router)
app.include_router(pdf_router)
register_exception_handlers(app)


@app.get("/health")
def health():
    return {"status": "ok"}
