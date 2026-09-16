"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const intervalRef = useRef(null);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data);
      setFetchError(null);
    } catch (e) {
      setFetchError(e.message);
    }
  }

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 2500);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message: text }),
      });
      const data = await res.json();
      setSendResult(data);
    } catch (err) {
      setSendResult({ error: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>WhatsApp API Tester</h1>

      {/* ── Send form ── */}
      <section style={styles.card}>
        <h2 style={styles.h2}>Send Message</h2>
        <form onSubmit={handleSend} style={styles.form}>
          <label style={styles.label}>
            To (phone number with country code, no +)
            <input
              style={styles.input}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="15551234567"
              required
            />
          </label>
          <label style={styles.label}>
            Message
            <textarea
              style={{ ...styles.input, height: 80, resize: "vertical" }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hello from the test tool"
              required
            />
          </label>
          <button style={styles.button} type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send"}
          </button>
        </form>

        {sendResult && (
          <div style={styles.resultBox}>
            <strong>Response from /api/send:</strong>
            <pre style={styles.pre}>{JSON.stringify(sendResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* ── Incoming feed ── */}
      <section style={styles.card}>
        <h2 style={styles.h2}>
          Incoming Messages{" "}
          <span style={styles.badge}>polling every 2.5 s</span>
        </h2>

        {fetchError && (
          <div style={{ ...styles.resultBox, borderColor: "#f66" }}>
            <strong>Fetch error:</strong> {fetchError}
          </div>
        )}

        {messages.length === 0 && !fetchError && (
          <p style={styles.empty}>No messages yet. Send something to your WhatsApp number.</p>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id ?? i} style={styles.msgCard}>
            <div style={styles.msgMeta}>
              <span>
                <strong>From:</strong> {msg.from}
              </span>
              <span>
                <strong>Type:</strong> {msg.type}
              </span>
              <span style={styles.ts}>
                {msg.receivedAt
                  ? new Date(Number(msg.receivedAt)).toLocaleTimeString()
                  : new Date(Number(msg.timestamp) * 1000).toLocaleTimeString()}
              </span>
            </div>
            {msg.text && <div style={styles.msgText}>{msg.text}</div>}
            <details style={styles.details}>
              <summary>Raw payload</summary>
              <pre style={styles.pre}>{JSON.stringify(msg.raw, null, 2)}</pre>
            </details>
          </div>
        ))}
      </section>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "monospace",
    maxWidth: 720,
    margin: "0 auto",
    padding: "24px 16px",
    background: "#0d0d0d",
    minHeight: "100vh",
    color: "#e8e8e8",
  },
  h1: { fontSize: 22, marginBottom: 24, color: "#25d366" },
  h2: { fontSize: 16, marginBottom: 14, color: "#25d366" },
  card: {
    border: "1px solid #333",
    borderRadius: 6,
    padding: 20,
    marginBottom: 24,
    background: "#161616",
  },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13 },
  input: {
    background: "#222",
    border: "1px solid #444",
    borderRadius: 4,
    color: "#e8e8e8",
    padding: "8px 10px",
    fontFamily: "monospace",
    fontSize: 13,
    outline: "none",
  },
  button: {
    alignSelf: "flex-start",
    background: "#25d366",
    color: "#000",
    border: "none",
    borderRadius: 4,
    padding: "8px 20px",
    fontFamily: "monospace",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
  },
  resultBox: {
    marginTop: 14,
    border: "1px solid #444",
    borderRadius: 4,
    padding: 12,
    fontSize: 13,
  },
  pre: {
    margin: "8px 0 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    color: "#aef",
    fontSize: 12,
  },
  badge: {
    fontSize: 11,
    background: "#1f2f1f",
    color: "#6f6",
    borderRadius: 3,
    padding: "2px 6px",
    fontWeight: "normal",
    marginLeft: 8,
  },
  empty: { color: "#666", fontSize: 13 },
  msgCard: {
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    background: "#1a1a1a",
  },
  msgMeta: {
    display: "flex",
    gap: 16,
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  ts: { marginLeft: "auto" },
  msgText: { fontSize: 14, color: "#e8e8e8", marginBottom: 6 },
  details: { fontSize: 12, color: "#888", cursor: "pointer" },
};
