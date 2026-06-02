import { useState, useRef, useEffect } from "react";

const API = "http://127.0.0.1:8000";

const COLORS = [
  { from: "#ff6b6b", to: "#feca57" },
  { from: "#48dbfb", to: "#ff9ff3" },
  { from: "#54a0ff", to: "#5f27cd" },
  { from: "#1dd1a1", to: "#10ac84" },
];

function TypingDots() {
  return (
    <span style={styles.typingDots}>
      <span style={{ ...styles.dot, animationDelay: "0s" }} />
      <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
      <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
    </span>
  );
}

function Message({ msg, index }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  const color = COLORS[index % COLORS.length];

  return (
    <div
      style={{
        ...styles.messageWrapper,
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: `slideIn 0.3s ease ${index * 0.05}s both`,
      }}
    >
      {!isUser && !isSystem && (
        <div style={styles.avatar}>🤖</div>
      )}
      <div
        style={{
          ...styles.bubble,
          background: isUser
            ? `linear-gradient(135deg, ${color.from}, ${color.to})`
            : isSystem
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.12)",
          color: "#fff",
          borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
          border: isSystem ? "1px solid rgba(255,255,255,0.2)" : "none",
          maxWidth: isSystem ? "100%" : "75%",
          textAlign: isSystem ? "center" : "left",
        }}
      >
        {isSystem && <span style={styles.systemIcon}>✨</span>}
        {msg.text}
      </div>
      {isUser && <div style={styles.avatar}>👤</div>}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [colorIndex, setColorIndex] = useState(0);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((i) => (i + 1) % COLORS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    setUploading(true);
    setUploadedFile(file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "system", text: `📄 ${data.message}` }]);
    } catch {
      setMessages((prev) => [...prev, { role: "system", text: "Upload failed. Is the backend running?" }]);
    }
    setUploading(false);
  };

  const onFileChange = (e) => handleUpload(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files[0]);
  };

  const askQuestion = async () => {
    if (!question.trim() || loading) return;
    const userMsg = question.trim();
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
      setMessages((prev) => [...prev, { role: "agent", text: "Error getting response. Is the backend running?" }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const gradient = `linear-gradient(135deg, ${COLORS[colorIndex].from}, ${COLORS[colorIndex].to})`;
  const nextColor = COLORS[(colorIndex + 1) % COLORS.length];
  const animatedGradient = `linear-gradient(135deg, ${COLORS[colorIndex].from}, ${COLORS[colorIndex].to}, ${nextColor.from})`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; font-family: 'Space Mono', monospace; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(255,255,255,0.2); }
          50% { border-color: rgba(255,255,255,0.6); }
        }
        .upload-zone:hover { border-color: rgba(255,255,255,0.6) !important; transform: scale(1.02); }
        .send-btn:hover { transform: scale(1.05); filter: brightness(1.2); }
        .send-btn:active { transform: scale(0.97); }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>

      <div style={styles.page}>
        {/* Animated background blobs */}
        <div style={{ ...styles.blob, background: COLORS[colorIndex].from, top: "10%", left: "5%", animationDelay: "0s" }} />
        <div style={{ ...styles.blob, background: COLORS[(colorIndex + 1) % 4].to, top: "60%", right: "5%", animationDelay: "1.5s" }} />
        <div style={{ ...styles.blob, background: COLORS[(colorIndex + 2) % 4].from, bottom: "10%", left: "40%", animationDelay: "3s", width: 200, height: 200 }} />

        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <div style={{ animation: "float 3s ease-in-out infinite" }}>
              <div style={{ ...styles.logo, background: gradient, transition: "background 1s ease" }}>
                🧠
              </div>
            </div>
            <div>
              <h1 style={{ ...styles.title, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", background: animatedGradient, backgroundSize: "200% 200%", animation: "gradientShift 3s ease infinite" }}>
                Knowledge Agent
              </h1>
              <p style={styles.subtitle}>RAG · MCP · Local AI · Zero Cost</p>
            </div>
          </div>

          {/* Upload zone */}
          <div
            className="upload-zone"
            style={{
              ...styles.uploadZone,
              borderColor: dragOver ? "rgba(255,255,255,0.8)" : uploading ? COLORS[colorIndex].from : "rgba(255,255,255,0.25)",
              background: dragOver ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
              transition: "all 0.3s ease",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <label style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 36, animation: uploading ? "spin 1s linear infinite" : "float 3s ease-in-out infinite" }}>
                {uploading ? "⚙️" : uploadedFile ? "📄" : "📂"}
              </div>
              <div style={{ color: "#fff", fontWeight: "700", fontSize: 14, letterSpacing: 1 }}>
                {uploading ? "INGESTING..." : uploadedFile ? uploadedFile : "DROP PDF OR CLICK TO UPLOAD"}
              </div>
              {!uploading && (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                  chunks → embeddings → FAISS vector store
                </div>
              )}
              <input type="file" accept=".pdf" onChange={onFileChange} style={{ display: "none" }} />
            </label>
          </div>

          {/* Chat window */}
          <div style={styles.chatBox}>
            {messages.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.8 }}>
                  Upload a PDF above<br />then ask anything about it
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <Message key={i} msg={msg} index={i} />)
            )}
            {loading && (
              <div style={{ ...styles.messageWrapper, justifyContent: "flex-start" }}>
                <div style={styles.avatar}>🤖</div>
                <div style={{ ...styles.bubble, background: "rgba(255,255,255,0.1)" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={styles.input}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="Ask anything about your documents..."
            />
            <button
              className="send-btn"
              style={{
                ...styles.sendBtn,
                background: gradient,
                transition: "background 1s ease, transform 0.15s ease",
                opacity: loading || !question.trim() ? 0.5 : 1,
              }}
              onClick={askQuestion}
              disabled={loading || !question.trim()}
            >
              {loading ? "⏳" : "→"}
            </button>
          </div>

          {/* Status bar */}
          <div style={styles.statusBar}>
            <span style={styles.statusDot} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
              llama3.2:3b · FAISS · MCP tools · running locally
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "fixed",
    width: 300,
    height: 300,
    borderRadius: "50%",
    filter: "blur(80px)",
    opacity: 0.12,
    animation: "float 6s ease-in-out infinite",
    pointerEvents: "none",
    transition: "background 1s ease",
  },
  container: {
    width: "100%",
    maxWidth: 680,
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -1,
  },
  subtitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 2,
    fontFamily: "'Space Mono', monospace",
  },
  uploadZone: {
    border: "2px dashed",
    borderRadius: 16,
    padding: "24px 20px",
    textAlign: "center",
    cursor: "pointer",
    animation: "borderPulse 3s ease-in-out infinite",
  },
  chatBox: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 20,
    minHeight: 320,
    maxHeight: 420,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    textAlign: "center",
  },
  messageWrapper: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
  },
  avatar: {
    fontSize: 22,
    flexShrink: 0,
    lineHeight: 1,
  },
  bubble: {
    padding: "12px 16px",
    fontSize: 13,
    lineHeight: 1.7,
    maxWidth: "75%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  systemIcon: {
    marginRight: 6,
  },
  inputRow: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: "14px 18px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    caretColor: "#fff",
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    border: "none",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    fontWeight: "bold",
    flexShrink: 0,
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#1dd1a1",
    animation: "pulse 2s ease-in-out infinite",
    display: "inline-block",
  },
  typingDots: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    height: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.6)",
    display: "inline-block",
    animation: "pulse 1s ease-in-out infinite",
  },
};