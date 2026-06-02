from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from app.mcp_tools import read_file_tool, list_files_tool
import ollama
import re

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_PATH = "app/data/faiss_index"

def detect_tool_call(question: str):
    """
    Check if the question is asking to read a file or list a directory.
    Returns (tool_name, argument) or (None, None)
    """
    question_lower = question.lower()

    # Detect file read requests
    if any(word in question_lower for word in ["read file", "open file", "show file", "read the file"]):
        # Extract path - look for anything that looks like a file path
        match = re.search(r'["\']?(/[\w/.\-]+\.\w+)["\']?', question)
        if match:
            return "read_file", match.group(1)

    # Detect directory listing requests
    if any(word in question_lower for word in ["list files", "show files", "what files", "list directory"]):
        match = re.search(r'["\']?(/[\w/.\-]+)["\']?', question)
        if match:
            return "list_files", match.group(1)

    return None, None

def answer_question(question: str) -> str:
    # Step 1: Check if this needs a tool call
    tool_name, tool_arg = detect_tool_call(question)

    if tool_name == "read_file":
        file_content = read_file_tool(tool_arg)
        context = f"File content from {tool_arg}:\n{file_content}"
        source = f"[Tool used: read_file({tool_arg})]"
    elif tool_name == "list_files":
        dir_content = list_files_tool(tool_arg)
        context = f"Files in {tool_arg}:\n{dir_content}"
        source = f"[Tool used: list_files({tool_arg})]"
    else:
        # Step 2: Fall back to RAG
        try:
            embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            vectorstore = FAISS.load_local(
                FAISS_PATH,
                embeddings,
                allow_dangerous_deserialization=True
            )
            relevant_chunks = vectorstore.similarity_search(question, k=3)
            context = "\n\n".join([chunk.page_content for chunk in relevant_chunks])
            source = "[Source: uploaded documents]"
        except Exception:
            context = "No documents have been uploaded yet."
            source = ""

    # Step 3: Send to Ollama
    prompt = f"""Use the following context to answer the question.
If the answer is not in the context, say "I don't know based on the available information."

Context:
{context}

Question: {question}
"""

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response["message"]["content"]
    return f"{answer}\n\n{source}" if source else answer