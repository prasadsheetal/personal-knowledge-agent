# Personal Knowledge Agent

A conversational AI agent that answers questions over your own documents using RAG (Retrieval-Augmented Generation), with MCP-based tool integrations for filesystem access.

## What it does

- Upload PDF documents via a React UI
- Ask questions in natural language
- Agent retrieves relevant chunks from your documents and answers using a local LLM
- Agent can also read files directly from your filesystem via MCP tool calls
- Runs 100% locally — no API keys, no cost, no data sent to the cloud

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Llama 3.2 3B via Ollama (local) |
| RAG | LangChain + FAISS vector store |
| Embeddings | HuggingFace all-MiniLM-L6-v2 (local) |
| Tool Use | MCP-style filesystem tools |
| Backend | FastAPI (Python) |
| Frontend | React |

## Architecture

User uploads PDF
→ chunked into 500-char segments with 50-char overlap
→ embedded via sentence-transformers
→ stored in FAISS vector index

User asks a question
→ agent checks if it needs a tool (read file, list directory)
→ if yes: executes MCP tool and uses result as context
→ if no: retrieves top-3 relevant chunks from FAISS
→ sends context + question to local Llama model
→ returns grounded answer with source attribution

## Running locally

Prerequisites: Python 3.9+, Node.js, Ollama

1. Pull the model
ollama pull llama3.2:3b

2. Start the backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

3. Start the frontend
cd frontend
npm install
npm start

Open http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| /health | GET | Health check |
| /upload | POST | Upload and ingest a PDF |
| /ask | POST | Ask a question |

## Design Decisions

- FAISS over ChromaDB: no external service dependency, simpler for local use
- Fixed-size chunking 500 chars with 50 overlap: predictable, explainable, works well for document Q&A
- MCP tool routing: regex-based intent detection routes to tools before falling back to RAG
- Local LLM: privacy-preserving, zero cost, fully offline