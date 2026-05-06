from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .exceptions import register_exception_handlers
from .routers.conversations import router as conversations_router

app = FastAPI(title="LociGraph")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(conversations_router)
register_exception_handlers(app)


@app.get("/health")
def health():
    return {"status": "ok"}
