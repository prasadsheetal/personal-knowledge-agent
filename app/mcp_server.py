# Real MCP Server — exposes tools over the MCP protocol
from mcp.server.fastmcp import FastMCP
from duckduckgo_search import DDGS
import os

mcp = FastMCP("knowledge-agent-tools")

@mcp.tool()
def read_file(file_path: str) -> str:
    """Read a text file from the local filesystem."""
    try:
        allowed = [".txt", ".md", ".py", ".js", ".ts", ".json", ".csv"]
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in allowed:
            return f"Error: file type {ext} not allowed"
        if not os.path.exists(file_path):
            return f"Error: file not found at {file_path}"
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content[:3000] + "\n[truncated]" if len(content) > 3000 else content
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def list_directory(directory: str) -> str:
    """List files in a directory."""
    try:
        if not os.path.exists(directory):
            return f"Error: directory not found"
        files = os.listdir(directory)
        return "\n".join(files) if files else "Empty directory"
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def web_search(query: str) -> str:
    """Search the web using DuckDuckGo. Free, no API key needed."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
        if not results:
            return "No results found"
        output = []
        for r in results:
            output.append(f"Title: {r['title']}\nSummary: {r['body']}\nURL: {r['href']}\n")
        return "\n".join(output)
    except Exception as e:
        return f"Search error: {str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio")