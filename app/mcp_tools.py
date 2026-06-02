import os

def read_file_tool(file_path: str) -> str:
    """
    MCP-style tool: reads a file from the local filesystem and returns its content.
    The agent calls this when the user asks about a specific file by path.
    """
    try:
        # Security check: only allow reading text files
        allowed_extensions = [".txt", ".md", ".py", ".js", ".ts", ".json", ".csv"]
        ext = os.path.splitext(file_path)[1].lower()

        if ext not in allowed_extensions:
            return f"Error: File type {ext} not allowed. Only text files are supported."

        if not os.path.exists(file_path):
            return f"Error: File not found at {file_path}"

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Limit to 3000 chars so we don't overflow the LLM context
        if len(content) > 3000:
            content = content[:3000] + "\n\n[File truncated at 3000 characters]"

        return content

    except Exception as e:
        return f"Error reading file: {str(e)}"


def list_files_tool(directory: str) -> str:
    """
    MCP-style tool: lists files in a directory.
    """
    try:
        if not os.path.exists(directory):
            return f"Error: Directory not found at {directory}"

        files = os.listdir(directory)
        return "\n".join(files) if files else "Directory is empty"

    except Exception as e:
        return f"Error listing directory: {str(e)}"