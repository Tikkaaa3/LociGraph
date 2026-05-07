# LociGraph

<p align="center">
  <strong>Graph-Based RAG with the Method of Loci</strong><br>
  Structure knowledge as an activated memory graph. Upload documents, explore semantic connections, and generate strictly grounded answers with visual memory replay.
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

## Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Setup](#-setup)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [OpenRouter Configuration](#-openrouter-configuration)
- [Rate Limits & Known Issues](#-rate-limits--known-issues)
- [Development Notes](#-development-notes)
- [Roadmap](#-roadmap)
- [Credits](#-credits)

---

## 🧠 Overview

**LociGraph** is inspired by the *Method of Loci* (memory palace) — a technique where information is organized spatially and retrieved by walking through familiar paths. Instead of flat vector search, LociGraph indexes document chunks as **nodes in a semantic similarity graph**. When you ask a question, it "activates" relevant regions of the graph, propagates signals across connected concepts, and visualizes the process in real time.

The result is a **Retrieval-Augmented Generation (RAG)** system that surfaces not just top-K matches, but structurally related context, grounded by strict citation constraints and model-agnostic LLM generation.

---

## 🎥 Demo

_Screenshots and demo video coming soon._

---

## ✨ Features

- **📄 PDF & Text Ingestion** — Upload PDFs or raw text for automatic semantic chunking and indexing.
- **🕸️ Live Memory Graph** — Watch activation spread across a force-directed graph. Nodes glow based on activation strength, hop depth, and edge weight.
- **💬 Conversational RAG** — Chat with your documents. The assistant cites exact chunk references (`[1]`, `[2]`) and falls back to "not in provided context" when information is missing.
- **🧠 Graph-Based Retrieval** — Four retrieval modes: `keyword`, `semantic`, `hybrid`, and `graph`. Graph mode uses seeded activation propagation with per-hop decay.
- **🔍 Node Inspector** — Click any node to inspect its raw content, activation percentage, and top neighbors.
- **🔗 Model Agnostic** — Works with any OpenAI-compatible API. Developed and tested against **OpenRouter** (DeepSeek, LLaMA, etc.).

---

## 🏗️ Architecture

