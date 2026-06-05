from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.ingest import ingest_pdf
from app.query import answer_question
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    temp_path = f"app/data/{file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    num_chunks = ingest_pdf(temp_path)
    return {"message": f"Ingested {num_chunks} chunks from {file.filename}"}

@app.post("/ask")
async def ask_question(payload: dict):
    question = payload.get("question")
    if not question:
        return {"error": "No question provided"}
    answer = answer_question(question)
    return {"answer": answer}

@app.get("/health")
async def health():
    return {"status": "ok"}

from app.agent import run_agent

@app.post("/agent")
async def agent_query(payload: dict):
    question = payload.get("question")
    if not question:
        return {"error": "No question provided"}
    result = run_agent(question)
    return result

from fastapi.responses import StreamingResponse
import json

@app.post("/ask-stream")
async def ask_stream(payload: dict):
    question = payload.get("question")
    history = payload.get("history", [])  # list of {role, content} dicts
    if not question:
        return {"error": "No question provided"}

    async def generate():
        # Step 1: Get relevant chunks from FAISS
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            from langchain_community.vectorstores import FAISS
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            vectorstore = FAISS.load_local(
                "app/data/faiss_index",
                embeddings,
                allow_dangerous_deserialization=True
            )
            chunks = vectorstore.similarity_search(question, k=3)
            context = "\n\n".join([c.page_content for c in chunks])
        except Exception:
            context = "No documents uploaded yet."

        # Step 2: Build messages with history
        system_prompt = f"""You are a helpful assistant that answers questions based on uploaded documents.
Use the following document context to answer questions.
If the answer is not in the context, say "I don't know based on the documents provided."

Document context:
{context}"""

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 6 messages to stay within context window)
        for msg in history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current question
        messages.append({"role": "user", "content": question})

        # Step 3: Stream response
        import ollama
        stream = ollama.chat(
            model="llama3.2:3b",
            messages=messages,
            stream=True
        )

        for chunk in stream:
            token = chunk["message"]["content"]
            yield f"data: {json.dumps({'token': token})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")