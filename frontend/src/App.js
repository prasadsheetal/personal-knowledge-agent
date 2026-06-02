import { useState } from "react";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "system", text: data.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: "system", text: "Upload failed." }]);
    }
    setUploading(false);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    const userMsg = question;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "agent", text: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "agent", text: "Error getting response." }]);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Personal Knowledge Agent</h1>
      <p style={styles.subtitle}>Upload documents and ask questions — powered by local AI</p>

      {/* Upload */}
      <div style={styles.uploadBox}>
        <label style={styles.uploadLabel}>
          {uploading ? "Uploading..." : "Upload a PDF"}
          <input type="file" accept=".pdf" onChange={uploadFile} style={{ display: "none" }} />
        </label>
      </div>

      {/* Chat window */}
      <div style={styles.chatBox}>
        {messages.length === 0 && (
          <p style={styles.placeholder}>Upload a PDF, then ask a question about it.</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={styles.message(msg.role)}>
            <strong>{msg.role === "user" ? "You" : msg.role === "agent" ? "Agent" : "System"}:</strong>{" "}
            {msg.text}
          </div>
        ))}
        {loading && <div style={styles.message("agent")}><em>Thinking...</em></div>}
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askQuestion()}
          placeholder="Ask a question about your documents..."
        />
        <button style={styles.button} onClick={askQuestion} disabled={loading}>
          {loading ? "..." : "Ask"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", padding: "0 20px" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#666", marginBottom: 20 },
  uploadBox: { marginBottom: 16 },
  uploadLabel: {
    display: "inline-block", padding: "10px 20px", background: "#0070f3",
    color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: "bold"
  },
  chatBox: {
    border: "1px solid #ddd", borderRadius: 8, padding: 16,
    minHeight: 300, maxHeight: 400, overflowY: "auto", marginBottom: 16, background: "#fafafa"
  },
  placeholder: { color: "#999", textAlign: "center", marginTop: 100 },
  message: (role) => ({
    marginBottom: 12, padding: "8px 12px", borderRadius: 6,
    background: role === "user" ? "#e8f0fe" : role === "agent" ? "#f0fdf4" : "#fff8e1",
    textAlign: "left"
  }),
  inputRow: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "10px 14px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 },
  button: {
    padding: "10px 20px", background: "#0070f3", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold"
  },
};