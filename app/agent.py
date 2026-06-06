# Real Agentic loop — ReAct pattern (Reason + Act)
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from duckduckgo_search import DDGS
import ollama
import os

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_PATH = "app/data/faiss_index"
MAX_STEPS = 2  # prevent infinite loops

TOOLS = {
    "search_documents": {
        "description": "Search uploaded documents for relevant information. Use this for questions about uploaded PDFs.",
        "args": ["query"]
    },
    "read_file": {
        "description": "Read a specific file from the filesystem by its path.",
        "args": ["file_path"]
    },
    "web_search": {
        "description": "Search the web for current information not in documents.",
        "args": ["query"]
    },
    "final_answer": {
        "description": "Return the final answer to the user. Use this when you have enough information.",
        "args": ["answer"]
    }
}

def search_documents(query: str) -> str:
    try:
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        vectorstore = FAISS.load_local(
            FAISS_PATH, embeddings, allow_dangerous_deserialization=True
        )
        chunks = vectorstore.similarity_search(query, k=3)
        return "\n\n".join([c.page_content for c in chunks])
    except Exception:
        return "No documents uploaded yet."

def read_file(file_path: str) -> str:
    try:
        allowed = [".txt", ".md", ".py", ".js", ".json", ".csv"]
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in allowed:
            return f"File type {ext} not allowed"
        if not os.path.exists(file_path):
            return f"File not found: {file_path}"
        with open(file_path, "r") as f:
            content = f.read()
        return content[:3000] + "\n[truncated]" if len(content) > 3000 else content
    except Exception as e:
        return f"Error: {str(e)}"

def web_search(query: str) -> str:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
        if not results:
            return "No results found"
        return "\n\n".join([f"{r['title']}: {r['body']}" for r in results])
    except Exception as e:
        return f"Search error: {str(e)}"

def run_agent(question: str) -> dict:
    steps = []
    observations = []

    tools_description = "\n".join([
        f"- {name}: {info['description']} (args: {info['args']})"
        for name, info in TOOLS.items()
    ])

    for step in range(MAX_STEPS):
        history = ""
        for s in steps:
            history += f"\nThought: {s['thought']}\nAction: {s['action']}({s['args']})\nObservation: {s['observation']}\n"

        prompt = f"""You are an efficient AI agent. Answer the question in as few steps as possible.

Available tools:
{tools_description}

Question: {question}
{history}

Rules:
- If the question is about uploaded documents, use search_documents FIRST
- If you have enough information after one tool call, use final_answer immediately
- Only use web_search if the document search returns nothing useful
- Never repeat the same tool call twice

Respond in EXACTLY this format:
Thought: [one sentence reasoning]
Action: [tool name]
Args: [argument value]"""

        response = ollama.chat(
            model="llama3.2:3b",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response["message"]["content"]

        thought, action, args = "", "", ""
        for line in raw.split("\n"):
            if line.startswith("Thought:"):
                thought = line.replace("Thought:", "").strip()
            elif line.startswith("Action:"):
                action = line.replace("Action:", "").strip()
            elif line.startswith("Args:"):
                args = line.replace("Args:", "").strip()

        if action == "final_answer" or not action:
            steps.append({"thought": thought, "action": "final_answer", "args": args, "observation": ""})
            return {"answer": args or raw, "steps": steps}
        elif action == "search_documents":
            observation = search_documents(args)
        elif action == "read_file":
            observation = read_file(args)
        elif action == "web_search":
            observation = web_search(args)
        else:
            observation = f"Unknown tool: {action}"

        steps.append({
            "thought": thought,
            "action": action,
            "args": args,
            "observation": observation[:500]
        })
        observations.append(observation)

    final_prompt = f"""Based on this research, answer the question: {question}

Research findings:
{chr(10).join(observations)}

Give a clear, direct answer."""

    final = ollama.chat(
        model="llama3.2:3b",
        messages=[{"role": "user", "content": final_prompt}]
    )
    steps.append({"thought": "Max steps reached, summarizing", "action": "final_answer", "args": "", "observation": ""})
    return {"answer": final["message"]["content"], "steps": steps}