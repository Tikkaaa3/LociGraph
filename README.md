# LociGraph

<p align="center">
  <strong>🧠 Graph-Based RAG with the Method of Loci</strong><br>
  Structure knowledge as an activated memory graph. Upload documents, explore semantic connections, and generate strictly grounded answers with visual memory
replay.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose">
</p>

---

## 🧠 Overview

**LociGraph** is inspired by the _Method of Loci_ (memory palace) — a technique where information is organized spatially and retrieved by walking through
familiar paths. Instead of flat vector search, LociGraph indexes document chunks as nodes in a **semantic similarity graph**. When you ask a question, it
"activates" relevant regions of the graph, propagating signals across connected concepts, and visualizes the process in real time.

The result is a **Retrieval-Augmented Generation (RAG)** system that surfaces not just top-K matches, but structurally related context, grounded by strict
citation constraints and model-agnostic LLM generation.

---

## 🎥 Demo

_Demo video / screenshots coming soon._

---

## ✨ Features

### User Features

- 📄 **PDF & Text Ingestion** — Upload PDFs or raw text documents for automatic semantic chunking and indexing.
- 💬 **Conversational RAG** — Chat with your documents. The assistant cites exact chunk references (`[1]`, `[2]`) and refuses to hallucinate outside the
  provided context.
- 🕸️ **Real-Time Memory Graph** — Watch the memory graph activate as you chat. Nodes glow based on activation strength, with force-directed physics.
- 🔍 **Node Inspector** — Click any node to inspect its raw content, activation percentage, and top neighbors.

### System Features

- ✂️ **Semantic Chunking** — Sentence-boundary-aware chunking using spaCy + sentence-transformers with rolling centroid similarity and hard/soft split
  thresholds.
- 🕸️ **Graph-Based Retrieval** — Four retrieval modes: `keyword`, `semantic`, `hybrid`, and `graph`. Graph mode uses seeded activation propagation with hop
  decay.
- 📊 **Activation Propagation** — Hybrid-scored seeds undergo softmax temperature sharpening (`T=0.5`), then propagate across edges with per-hop decay
  (`0.6^hop × edge_weight`).

### AI Features

- 🔗 **Strict Citation Prompting** — System prompt enforces chunk citations and a "not in provided context" fallback.
- 🔄 **Model Agnostic** — Works with any OpenAI-compatible API. Developed and tested against **OpenRouter** (e.g., DeepSeek V4 Flash, LLaMA variants).
- 🎯 **Grounded Generation** — `temperature=0.1`, short context windows, and explicit guardrails minimize hallucinations.

---

## 🏗️ Architecture

┌─────────────┐ ┌──────────────────┐ ┌─────────────────┐ │ Upload │────▶│ Extract & Chunk │────▶│ Embed & Graph│ │(PDF / Text) │ │(spaCy

- Sentence │ │ Index │ └─────────────┘ │ Transformers) │ │(Cosine Sim > │ └──────────────────┘ │ 0.30 → Edges) │
  └─────────────────┘ │ Query ▼ │ ┌─────────────────┐ ▼ │ Force-Directed │ ┌────────────┐ │ Memory Graph
  │ │ Retrieve │◄───────│ (Nodes/Edges) │ │ (Keyword / │ └─────────────────┘ │ Semantic /│ │ Hybrid / │ │ Graph) │ └─────┬──────┘ │ ▼
  ┌────────────┐ │ Build RAG │ │ Prompt │ │([1] chunk) │ └─────┬──────┘ │ ▼ ┌────────────┐ │ LLM │ │(OpenRouter)│ └─────┬──────┘ │ ▼ ┌────────────┐
  │ Cited │ │ Answer │ └────────────┘

### Graph Retrieval Pipeline (`graph` mode)

1. **Seeding** — Run hybrid scoring (40% keyword overlap + 60% normalized semantic similarity) over all chunks to find top-K seed nodes.
2. **Activation Sharpening** — Apply temperature-scaled softmax (`T=0.5`) to seed scores so the most relevant chunk dominates.
3. **Propagation** — Breadth-first expansion across graph edges. Activation decays per hop (`0.6^hop`) and scales by edge weight (`(cosine_sim + 1) / 2`).
   Values aggregate via `max()`, preventing runaway inflation.
4. **Normalization** — Final activations are max-normalized to `[0, 1]`.
5. **Visualization** — The frontend receives activated nodes + top-3 neighbors and renders them in a `react-force-graph-2d` canvas with glow, color heatmaps,
   and hop-depth camera focusing.

---

## ⚙️ How It Works

### 1. Document Ingestion

- **Text**: Sent directly to the chunking service.
- **PDF**: PyMuPDF extracts raw text, which is normalized (whitespace collapsed) before chunking.

### 2. Semantic Chunking (`chunking.py`)

- **Split** the document into sentences using `en_core_web_sm`.
- **Embed** each sentence with `all-MiniLM-L6-v2`.
- **Group** sentences into chunks by comparing each new sentence to a _rolling centroid_ of the current chunk.
  - If similarity drops below `0.20` (hard reset), split immediately.
  - If similarity drops below `0.45` after at least 3 sentences, wait for confirmation (two consecutive low-sim sentences) before splitting.
- **Merge** post-hoc chunks shorter than 20 words into their closest semantic neighbor.

### 3. Graph Construction (`documents.py`)

Each chunk becomes a node with:

- `embedding`: 384-dim vector
- `edges`: Mapping to other chunks where raw cosine similarity > `0.30`
- `weight`: Normalized to `[0, 1]`

### 4. Query & Retrieval (`documents.py`)

- `keyword`: naive token overlap.
- `semantic`: cosine similarity between query embedding and chunk embedding.
- `hybrid`: `0.4 × keyword_score + 0.6 × semantic_score`.
- `graph`: runs hybrid scoring to pick seeds, then activates the graph as described above.

### 5. LLM Generation

• Uses the standard AsyncOpenAI client pointed at your configured base_url.
• Defaults to gpt-3.5-turbo but designed for OpenRouter model slugs.

---

🛠️ Tech Stack

Layer Technology
────────────────────────────────────────────────────────────────────────────
Backend Python, FastAPI, Uvicorn
NLP spaCy (en_core_web_sm), sentence-transformers (all-MiniLM-L6-v2)
ML/Utils NumPy, scikit-learn
PDF PyMuPDF
LLM Client OpenAI Python SDK (OpenRouter-compatible)
Frontend React 19, TypeScript, Vite
Styling Tailwind CSS
Graph Viz react-force-graph-2d
HTTP Client Axios
Infra Docker, Docker Compose

---

📁 Directory Structure

LociGraph/
├── backend/
│ ├── app/
│ │ ├── routers/
│ │ │ ├── conversations.py # Chat CRUD & message generation
│ │ │ └── documents.py # Text/PDF upload & retrieval endpoints
│ │ ├── services/
│ │ │ ├── chat.py # RAG pipeline + LLM generation
│ │ │ ├── documents.py # Graph index, activation, retrieval
│ │ │ └── chunking.py # Semantic sentence chunking
│ │ ├── models.py # Pydantic schemas
│ │ ├── exceptions.py # Custom HTTP exception handlers
│ │ └── main.py # FastAPI app entrypoint
│ └── requirements.txt
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ │ ├── ChatPanel.tsx # Chat UI + PDF upload
│ │ │ ├── MemoryGraph.tsx # 2D force-directed graph
│ │ │ ├── NodeSidebar.tsx # Top activated nodes list
│ │ │ ├── NodeDetailsPanel.tsx # Selected node inspector
│ │ │ └── SessionSidebar.tsx # Session history / replay
│ │ ├── context/
│ │ │ └── GraphContext.tsx # Global graph state
│ │ ├── hooks/
│ │ │ └── useMemoryReplay.ts # BFS hop-depth replay logic
│ │ ├── services/
│ │ │ └── api.ts # REST client, SSE/WS placeholders
│ │ ├── types/
│ │ │ ├── chat.ts # Message & conversation types
│ │ │ └── graph.ts # Node, Link, Session types
│ │ ├── App.tsx # 3-pane root layout
│ │ └── main.tsx # React bootstrapping
│ ├── package.json
│ └── vite.config.ts
└── infra/
└── docker-compose.yml # Backend + frontend orchestration

---

🚀 Setup

Prerequisites

• Python 3.11+
• Node.js 20+
• Docker & Docker Compose (optional)

1. Clone & Backend

cd backend
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

2. Frontend

cd frontend
npm install

3. Environment Configuration

Create backend/.env:

OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=deepseek/deepseek-chat-v3-0324:free

▌ Note: You can use any OpenAI-compatible endpoint. For OpenRouter, grab a key at https://openrouter.ai/keys.

---

🖥️ Usage

Local Development

Start the API server:

cd backend
uvicorn app.main:app --reload

• API docs: http://localhost:8000/docs

Start the frontend dev server:

cd frontend
npm run dev

• App: http://localhost:5173

Docker Compose

cd infra
docker-compose up --build

---

🔌 API Endpoints

Method Endpoint Description
───────────────────────────────────────────────────────────────
GET /health Health check
GET /conversations List all conversations
POST /conversations Create a new conversation
GET /conversations/{id} Get conversation metadata
DELETE /conversations/{id} Delete a conversation
GET /conversations/{id}/messages List messages for a conversation
POST /conversations/{id}/messages Send a message (triggers RAG + LLM reply)
POST /documents/upload Upload raw text document (replaces current index)
GET /documents/retrieve?q={query}&mode={mode} Retrieve top chunks (keyword, semantic, hybrid, graph)
POST /pdf/upload Upload a PDF file (multipart/form-data)

---

🧪 Development Notes

• Backend logging is set to DEBUG in main.py and overrides Uvicorn defaults, so you can observe chunking boundaries, graph edge creation, and activation
propagation in real time.
• Frontend hot-reload is handled by Vite.
• Graph tweaking: Adjust Y_OFFSET, d3AlphaDecay, and activation thresholds in the respective service/component files to fine-tune the visual feel.

---

🔑 OpenRouter Usage

LociGraph uses the standard OpenAI client configured for OpenRouter:

• Set OPENAI_BASE_URL=https://openrouter.ai/api/v1
• Set OPENAI_MODEL to any supported slug (e.g., deepseek/deepseek-chat, meta-llama/llama-3.3-70b-instruct, etc.)
• The HTTP-Referer and X-Title headers are automatically injected for ranking on OpenRouter.

---

⚠️ Limitations

• In-Memory Storage: Conversations and document chunks live in Python dictionaries. All data is lost on server restart. A persistent DB is the next major
upgrade.
• Single-User: No authentication, authorization, or multi-tenancy.
• Rate Limiting: Free-tier OpenRouter models (especially DeepSeek V4 Flash) frequently return HTTP 429 under rapid successive calls. Use paid keys or add
client-side retry logic for production use.
• Blocking Responses: The chat endpoint returns the full assistant message after generation. Streaming (SSE/WebSocket) is stubbed in the frontend but not
yet wired end-to-end.
• CPU Embeddings: Sentence embeddings run on CPU. Large documents will take time to index unless sentence-transformers is configured for CUDA.

---

🔮 Future Roadmap

• [ ] Persistent Vector Store — Migrate from in-memory dicts to Qdrant, pgvector, or similar.
• [ ] Streaming Responses — Wire Server-Sent Events for token-by-token chat display.
• [ ] Authentication — Multi-user accounts and private conversation namespaces.
• [ ] GPU Acceleration — Enable CUDA for embedding generation.
• [ ] Session Persistence — Save memory sessions and replay histories to the backend.
• [ ] Graph Analytics — PageRank, community detection, and temporal edge decay.

---

🙏 Credits

Developed with the assistance of AI coding tools, including Aider and Large Language Models. The semantic chunking heuristics, graph-activation algorithm,
and prompt engineering were iteratively refined through AI pair programming.
