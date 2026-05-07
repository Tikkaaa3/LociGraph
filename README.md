# LociGraph

<p align="center">
<strong>Graph-Based RAG with the Method of Loci</strong><br><br>
Think of it as a <b>memory-native RAG system</b>, where retrieval follows structure—not just similarity.<br><br>
Structure knowledge as an activated memory graph. Upload documents, explore semantic connections, and generate strictly grounded answers with visual memory replay.
</p>
 <p align="center">
   <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" alt="Python 3.11+">
   <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI">
   <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose">
 </p>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Setup](#setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [OpenRouter Configuration](#openrouter-configuration)
- [Rate Limits & Known Issues](#rate-limits--known-issues)
- [Development Notes](#development-notes)
- [Roadmap](#roadmap)

**LociGraph** is inspired by the _Method of Loci_ (memory palace) — a technique where information is organized spatially and retrieved by walking through
familiar paths. Instead of flat vector search, LociGraph indexes document chunks as **nodes in a semantic similarity graph**. When you ask a question, it
"activates" relevant regions of the graph, propagates signals across connected concepts, and visualizes the process in real time.

The result is a **Retrieval-Augmented Generation (RAG)** system that surfaces not just top-K matches, but structurally related context, grounded by strict
citation constraints and model-agnostic LLM generation.

## 🎬 Demo Video

👉 Click the image below to watch the demo on YouTube:

[![▶ Watch Demo](https://img.youtube.com/vi/lbM2K_ldJJ8/maxresdefault.jpg)](https://www.youtube.com/watch?v=lbM2K_ldJJ8)

## 🌟 Features

- **📄 PDF & Text Ingestion** — Upload PDFs or raw text for automatic semantic chunking and indexing.
- **🕸️ Live Memory Graph** — Visualize activation spreading across connected knowledge nodes.
- **💬 Conversational RAG** — Chat with strict citation grounding (`[1]`, `[2]`).
- **🧠 Graph-Based Retrieval** — keyword, semantic, hybrid, and graph modes.
- **🔍 Node Inspector** — Inspect node content, activation, and neighbors.
- **🔗 Model Agnostic** — Works with any OpenAI-compatible API.

---

## 🏗️ Architecture

```
┌─────────────┐ ┌──────────────┐ ┌─────────────────┐

│ Upload │────▶│ Extract │────▶│ Embed & Build │

│(PDF / Text) │ │ & Chunk │ │ Semantic Graph │

└─────────────┘ └──────────────┘ └─────────────────┘

                                                │

Query ◄─────────────────────────────────────────────┘

│

├──► keyword │ semantic │ hybrid │ graph

│

▼

┌─────────────────┐ ┌──────────────┐ ┌──────────────┐

│ Graph Memory │────▶│ Build RAG │────▶│ Generate │

│ (Activation) │ │ Prompt │ │ Answer │

└─────────────────┘ └──────────────┘ └──────────────┘
```

### Graph Retrieval Pipeline (`graph` mode)

1. **Seeding** — Hybrid scoring (40% keyword overlap + 60% normalized semantic similarity) ranks all chunks to select top-K seed nodes.

2. **Activation Sharpening** — Temperature-scaled softmax (`T=0.5`) sharpens seed scores so the most relevant chunk dominates.

3. **Propagation** — Breadth-first expansion across graph edges. Activation decays per hop (`0.6^hop`) and scales by edge weight (`(cosine_sim + 1) / 2`).
   Values aggregate via `max()` to prevent runaway inflation.

4. **Normalization** — Final activations are max-normalized to `[0, 1]`.

5. **Visualization** — The frontend receives activated nodes plus top-3 neighbors and renders them in `react-force-graph-2d` with glow, color heatmaps, and
   hop-depth camera focusing.

---

## ⚙️ How It Works

1. Documents → chunked into semantic units
2. Chunks → embedded and connected into a graph
3. Query → activates relevant nodes
4. Activation spreads → finds related context
5. LLM → generates grounded answer with citations

### 1. Document Ingestion

- **Text** — Sent directly to the chunking service.

- **PDF** — PyMuPDF extracts raw text, which is normalized (whitespace collapsed) before chunking.

### 2. Semantic Chunking (`chunking.py`)

- Split the document into sentences using `en_core_web_sm`.

- Embed each sentence with `all-MiniLM-L6-v2`.

- Group sentences into chunks by comparing each new sentence to a _rolling centroid_ of the current chunk.
  - If similarity drops below `0.20` (hard reset), split immediately.

  - If similarity drops below `0.45` after at least 3 sentences, wait for confirmation (two consecutive low-sim sentences) before splitting.

- Merge post-hoc chunks shorter than 20 words into their closest semantic neighbor.

### 3. Graph Construction (`documents.py`)

Each chunk becomes a node with:

- `embedding`: 384-dim vector

- `edges`: Mapping to other chunks where raw cosine similarity > `0.30`

- `weight`: Normalized to `[0, 1]`

### 4. Query & Retrieval (`documents.py`)

| Mode | Description |

|------|-------------|

| `keyword` | Naive token overlap |

| `semantic` | Cosine similarity between query and chunk embeddings |

| `hybrid` | `0.4 × keyword_score + 0.6 × semantic_score` |

| `graph` | Hybrid scoring to pick seeds, then activates the graph via BFS propagation (see [Architecture](#-architecture)) |

### 5. LLM Generation (`chat.py`)

- Uses the standard `AsyncOpenAI` client pointed at your configured `base_url`.

- System prompt enforces chunk citations (`[1]`, `[2]`) and a strict "not in provided context" fallback.

- `temperature=0.1`, `max_tokens=800`.

---

## 🛠️ Tech Stack

| Layer | Technology |

|---|---|

| Backend | Python 3.11+, FastAPI, Uvicorn |

| NLP | spaCy (`en_core_web_sm`), sentence-transformers (`all-MiniLM-L6-v2`) |

| ML/Utils | NumPy, scikit-learn |

| PDF | PyMuPDF |

| LLM Client | OpenAI Python SDK (OpenRouter-compatible) |

| Frontend | React 19, TypeScript, Vite |

| Styling | Tailwind CSS |

| Graph Viz | react-force-graph-2d |

| HTTP Client | Axios |

| Infra | Docker, Docker Compose |

---

## 📁 Directory Structure

```
LociGraph/

├── backend/

│ ├── app/

│ │ ├── routers/

│ │ │ ├── conversations.py # Chat CRUD & message generation

│ │ │ └── documents.py # Text/PDF upload & retrieval

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

├── infra/

│ └── docker-compose.yml # Backend + frontend orchestration

└── README.md
```

---

## ⚡ Quick Start

```bash
git clone https://github.com/Tikkaaa3/LociGraph
cd LociGraph/infra
docker-compose up --build

```

Then open:
<http://localhost:5173>

## 🚀 Setup

### Prerequisites

- Python 3.11+

- Node.js 20+

- Docker & Docker Compose (optional)

### 1. Backend

```
cd backend

python -m venv .venv

source .venv/bin/activate # Windows: .venv\Scripts\activate

pip install -r requirements.txt

python -m spacy download en_core_web_sm
```

### 2. Frontend

```
cd frontend

npm install
```

### 3. Environment Configuration

Create `backend/.env`:

```
OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

OPENAI_BASE_URL=https://openrouter.ai/api/v1

OPENAI_MODEL=deepseek/deepseek-chat-v3-0324:free
```

> **Note:** You can use any OpenAI-compatible endpoint. For OpenRouter, grab a key at [https://openrouter.ai/keys](https://openrouter.ai/keys).

---

## 🖥️ Usage

### Local Development

Start the API server:

```
cd backend

uvicorn app.main:app --reload
```

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

Start the frontend dev server:

```
cd frontend

npm run dev
```

- App: [http://localhost:5173](http://localhost:5173)

### Docker Compose

```
cd infra

docker-compose up --build
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |

|---|---|---|

| `GET` | `/health` | Health check |

| `GET` | `/conversations` | List all conversations |

| `POST` | `/conversations` | Create a new conversation |

| `GET` | `/conversations/{id}` | Get conversation metadata |

| `DELETE` | `/conversations/{id}` | Delete a conversation |

| `GET` | `/conversations/{id}/messages` | List messages |

| `POST` | `/conversations/{id}/messages` | Send a message (triggers RAG + LLM reply) |

| `POST` | `/documents/upload` | Upload raw text (replaces current index) |

| `GET` | `/documents/retrieve?q={query}&mode={mode}` | Retrieve top chunks |

| `POST` | `/pdf/upload` | Upload a PDF file (multipart/form-data) |

### Example: Ask a Question

**POST** `/conversations/{id}/messages`

**Request:**

```json
{
  "message": "What is method of loci?"
}
```

Response:

```json
{
  "answer": "...",
  "citations": [1, 3]
}
```

---

## 🔑 OpenRouter Configuration

LociGraph uses the standard OpenAI client configured for OpenRouter:

- Set `OPENAI_BASE_URL=https://openrouter.ai/api/v1`

- Set `OPENAI_MODEL` to any supported slug (e.g., `deepseek/deepseek-chat`, `meta-llama/llama-3.3-70b-instruct`, etc.)

- The `HTTP-Referer` and `X-Title` headers are automatically injected for ranking on OpenRouter.

---

## ⚠️ Rate Limits & Known Issues

- **Rate Limiting (429):** Free-tier OpenRouter models frequently return HTTP 429 under rapid successive calls. Use paid keys or add client-side retry logic
  for production use.

- **In-Memory Storage:** Conversations and document chunks live in Python dictionaries. All data is lost on server restart.

- **Single User:** No authentication, authorization, or multi-tenancy.

- **Blocking Responses:** The chat endpoint returns the full assistant message after generation. Streaming (SSE/WebSocket) is stubbed in the frontend but not
  yet wired end-to-end.

- **CPU Embeddings:** Sentence embeddings run on CPU. Large documents will take time to index unless `sentence-transformers` is configured for CUDA.

---

## 🧪 Development Notes

- Backend logging is set to `DEBUG` in `main.py` and overrides Uvicorn defaults, so you can observe chunking boundaries, graph edge creation, and activation
  propagation in real time.

- Frontend hot-reload is handled by Vite.

- Graph tweaking: Adjust `Y_OFFSET`, `d3AlphaDecay`, and activation thresholds in the respective service/component files to fine-tune the visual feel.

---

## 🔮 Roadmap

- [ ] **Persistent Vector Store** — Migrate from in-memory dicts to Qdrant, pgvector, or similar.

- [ ] **Streaming Responses** — Wire Server-Sent Events for token-by-token chat display.

- [ ] **Authentication** — Multi-user accounts and private conversation namespaces.

- [ ] **GPU Acceleration** — Enable CUDA for embedding generation.

- [ ] **Session Persistence** — Save memory sessions and replay histories to the backend.

- [ ] **Graph Analytics** — PageRank, community detection, and temporal edge decay.

---

## 🙏 Credits

This project was developed using AI-assisted engineering tools such as Aider and modern LLMs.

Rather than replacing engineering effort, these tools were used to:

- Rapidly prototype ideas
- Iterate on retrieval strategies
- Refine graph-based reasoning systems

Final architecture, algorithms, and system design were curated and validated manually.

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
