import { useState, useRef, useEffect } from "react";

const API = "http://127.0.0.1:8000";

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#a78bfa", display: "inline-block",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function StepTrace({ steps }) {
  const [open, setOpen] = useState(false);
  if (!steps || steps.length === 0) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)",
        borderRadius: 8, padding: "4px 12px", color: "#c4b5fd", fontSize: 11,
        cursor: "pointer", letterSpacing: 1,
      }}>
        {open ? "▾" : "▸"} {steps.length} AGENT STEPS
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "8px 12px", fontSize: 12,
            }}>
              <div style={{ color: "#a78bfa", fontWeight: 700, marginBottom: 2 }}>
                Step {i + 1} — {s.action}
              </div>
              {s.thought && <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>💭 {s.thought}</div>}
              {s.args && <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 11 }}>args: {s.args}</div>}
              {s.observation && <div style={{ color: "rgba(255,255,255,0.35)", marginTop: 4, fontSize: 11 }}>→ {s.observation.slice(0, 200)}{s.observation.length > 200 ? "..." : ""}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ msg, index }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  return (
    <div style={{
      display: "flex", gap: 12,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
      animation: "fadeUp 0.3s ease both",
      animationDelay: `${index * 0.04}s`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        background: isUser ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : isSystem ? "rgba(255,255,255,0.08)" : "rgba(167,139,250,0.15)",
        border: isUser ? "none" : "1px solid rgba(167,139,250,0.3)",
      }}>
        {isUser ? "👤" : isSystem ? "✨" : "🤖"}
      </div>
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{
          padding: "12px 16px",
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          background: isUser ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : isSystem ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
          color: "#fff", fontSize: 14, lineHeight: 1.7,
          wordBreak: "break-word", whiteSpace: "pre-wrap",
        }}>
          {msg.text}
        </div>
        {msg.steps && <StepTrace steps={msg.steps} />}
      </div>
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
  const [mode, setMode] = useState("rag");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleUpload = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    setUploading(true);
    setUploadedFile(file.name);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "system", text: data.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: "system", text: "Upload failed. Is the backend running?" }]);
    }
    setUploading(false);
  };

  const onFileChange = (e) => handleUpload(e.target.files[0]);
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); };

  const askQuestion = async () => {
    if (!question.trim() || loading) return;
    const userMsg = question.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuestion("");
    setLoading(true);

    if (mode === "agent") {
      try {
        const res = await fetch(`${API}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userMsg }),
        });
        const data = await res.json();
        setMessages((prev) => [...prev, {
          role: "agent", text: data.answer, steps: data.steps || null,
        }]);
      } catch {
        setMessages((prev) => [...prev, { role: "agent", text: "Error. Is the backend running?" }]);
      }
    } else {
      setMessages((prev) => [...prev, { role: "agent", text: "" }]);
      try {
        const res = await fetch(`${API}/ask-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: userMsg,
            history: messages
              .filter((m) => m.role === "user" || m.role === "agent")
              .map((m) => ({
                role: m.role === "agent" ? "assistant" : "user",
                content: m.text,
              })),
          }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.replace("data: ", "").trim();
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    text: updated[updated.length - 1].text + token,
                  };
                  return updated;
                });
              } catch {}
            }
          }
        }
      } catch {
        setMessages((prev) => [...prev, { role: "agent", text: "Error. Is the backend running?" }]);
      }
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d14; font-family: 'Inter', sans-serif; color: #fff; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 4px; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); }
        .send-btn:active:not(:disabled) { transform: scale(0.97); }
        input:focus { outline: none; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", flexDirection: "column", padding: "32px 60px 20px" }}>

        <div style={{ width: "100%", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, flexShrink: 0, boxShadow: "0 0 24px rgba(124,58,237,0.4)",
            }}>🧠</div>
            <div>
              <h1 style={{
                fontSize: 26, fontWeight: 600, letterSpacing: -0.5,
                background: "linear-gradient(90deg, #fff 0%, #a78bfa 50%, #818cf8 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "shimmer 4s linear infinite",
              }}>
                Personal Knowledge Agent
              </h1>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: 2, marginTop: 2 }}>
                RAG · MCP · REACT AGENT · LOCAL AI · ZERO COST
              </p>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

          <div style={{
            display: "flex", gap: 6, background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 4,
          }}>
            {[
              { id: "rag", label: "RAG Mode", icon: "📄", desc: "Search documents" },
              { id: "agent", label: "Agent Mode", icon: "🤖", desc: "Multi-step reasoning + web" },
            ].map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                flex: 1, padding: "10px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                background: mode === m.id ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "transparent",
                color: mode === m.id ? "#fff" : "rgba(255,255,255,0.4)",
                fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8, transition: "all 0.2s ease",
              }}>
                <span>{m.icon}</span>
                <span>{m.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>— {m.desc}</span>
              </button>
            ))}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `1.5px dashed ${dragOver ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 14, padding: "20px",
              background: dragOver ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.02)",
              transition: "all 0.2s ease", cursor: "pointer",
            }}
          >
            <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {uploading ? "⚙️" : uploadedFile ? "📄" : "📂"}
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 500, fontSize: 13 }}>
                  {uploading ? "Ingesting document..." : uploadedFile ? uploadedFile : "Drop PDF or click to upload"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 }}>
                  PDF → chunks → embeddings → FAISS vector store
                </div>
              </div>
              <input type="file" accept=".pdf" onChange={onFileChange} style={{ display: "none" }} />
            </label>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: 20, flex: 1, minHeight: 400,
            overflowY: "auto", display: "flex", flexDirection: "column", gap: 16,
          }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 }}>
                <div style={{ fontSize: 48 }}>💬</div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, textAlign: "center", lineHeight: 1.8 }}>
                  Upload a PDF, then ask anything about it<br />
                  Switch to Agent Mode for web search + multi-step reasoning
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <Message key={i} msg={msg} index={i} />)
            )}
            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>🤖</div>
                <div style={{ padding: "12px 16px", borderRadius: "4px 18px 18px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder={mode === "agent" ? "Ask anything — agent will search docs + web..." : "Ask a question about your documents..."}
              style={{
                flex: 1, background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
                padding: "14px 18px", color: "#fff", fontSize: 14, fontFamily: "'Inter', sans-serif",
              }}
            />
            <button
              className="send-btn"
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              style={{
                width: 52, height: 52, borderRadius: 12, border: "none", cursor: "pointer",
                background: loading || !question.trim() ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#fff", fontSize: 20, flexShrink: 0, transition: "all 0.2s ease",
                boxShadow: loading || !question.trim() ? "none" : "0 0 16px rgba(124,58,237,0.4)",
              }}
            >
              →
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, letterSpacing: 1 }}>
              {mode === "agent" ? "REACT AGENT · MCP TOOLS · WEB SEARCH · LOCAL LLM" : "RAG · FAISS · LLAMA 3.2 · RUNNING LOCALLY"}
            </span>
          </div>

        </div>
      </div>
    </>
  );
}