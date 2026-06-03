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