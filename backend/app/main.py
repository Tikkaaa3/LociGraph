from fastapi import FastAPI

app = FastAPI(title="LociGraph")


@app.get("/health")
def health():
    return {"status": "ok"}
