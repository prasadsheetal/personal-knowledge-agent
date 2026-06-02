from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import ollama

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_PATH = "app/data/faiss_index"

def answer_question(question: str) -> str:
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vectorstore = FAISS.load_local(
        FAISS_PATH,
        embeddings,
        allow_dangerous_deserialization=True
    )

    relevant_chunks = vectorstore.similarity_search(question, k=3)
    context = "\n\n".join([chunk.page_content for chunk in relevant_chunks])

    prompt = f"""Use the following context to answer the question.
If the answer is not in the context, say "I don't know based on the documents provided."

Context:
{context}

Question: {question}
"""

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[{"role": "user", "content": prompt}]
    )

    return response["message"]["content"]