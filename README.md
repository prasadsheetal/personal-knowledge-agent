# Personal Knowledge Agent

A full-stack agentic AI system that answers questions over your own documents using RAG, a ReAct agent loop, MCP tool integrations, and a local LLM. Runs 100% locally — no API keys, no cost.

## What it does

- Upload PDF documents via a React UI
- Switch between RAG Mode (document search) and Agent Mode (multi-step reasoning)
- RAG Mode: retrieves relevant chunks from FAISS and answers using local LLM
- Agent Mode: ReAct loop — agent reasons, picks a tool, observes the result, repeats until it has an answer
- MCP server exposes three tools: document search, filesystem read, web search (DuckDuckGo)
- See every agent step — thought, action, observation — collapsed in the UI
- Runs 100% locally — no API keys, no cost, no data sent to the cloud

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Llama 3.2 3B via Ollama (local) |
| RAG | LangChain + FAISS vector store |
| Embeddings | HuggingFace all-MiniLM-L6-v2 (local) |
| Agentic Loop | ReAct pattern (Reason + Act) |
| MCP Server | FastMCP with 3 registered tools |
| Web Search | DuckDuckGo (free, no API key) |
| Backend | FastAPI (Python) |
| Frontend | React |

## Architecture

RAG Pipeline:
User uploads PDF → chunked into 500-char segments with 50-char overlap → embedded via sentence-transformers → stored in FAISS vector index

Agent Loop (ReAct):
User asks question → agent reasons about which tool to use → calls tool → observes result → reasons again → repeats up to 3 steps → returns final answer with step trace

MCP Tools:
- search_documents: semantic search over uploaded PDFs
- read_file: read any text file from the local filesystem
- web_search: DuckDuckGo search for current information

## Running locally

Prerequisites: Python 3.9+, Node.js, Ollama

1. Pull the model
ollama pull llama3.2:3b

2. Start the backend
cd personal-knowledge-agent
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
| /ask | POST | RAG query — retrieves from FAISS and answers |
| /agent | POST | Agentic query — ReAct loop with tool use |

## Design Decisions

- FAISS over ChromaDB: no external service dependency, simpler for local use
- Fixed-size chunking 500 chars with 50 overlap: predictable, explainable, avoids boundary loss
- ReAct pattern: agent explicitly reasons before each action, making behavior interpretable
- MCP tool routing: standardized tool interface so new tools can be added without changing agent logic
- Max 3 agent steps: prevents infinite loops while allowing meaningful multi-step reasoning
- Local LLM: privacy-preserving, zero cost, fully offline
- DuckDuckGo for web search: free, no API key, no rate limit registration required