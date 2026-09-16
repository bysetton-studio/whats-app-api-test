"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState("__manual__");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [phoneStatus, setPhoneStatus] = useState(null);
  const intervalRef = useRef(null);

  // Numbers with an open 24-hour reply window, derived from stored messages.
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const activeWindows = Object.values(
    messages.reduce((acc, msg) => {
      const ts = Number(msg.receivedAt);
      if (!acc[msg.from] || ts > acc[msg.from].lastTs) {
        acc[msg.from] = { number: msg.from, lastTs: ts };
      }
      return acc;
    }, {})
  )
    .filter(({ lastTs }) => Date.now() - lastTs < WINDOW_MS)
    .sort((a, b) => b.lastTs - a.lastTs)
    .map(({ number, lastTs }) => {
      const msLeft = WINDOW_MS - (Date.now() - lastTs);
      const hLeft = Math.floor(msLeft / 3600000);
      const mLeft = Math.floor((msLeft % 3600000) / 60000);
      return { number, label: `${number} — ${hLeft}h ${mLeft}m left` };
    });

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

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setPhoneStatus(data);
    } catch (e) {
      setPhoneStatus({ error: e.message });
    }
  }

  useEffect(() => {
    fetchMessages();
    fetchStatus();
    intervalRef.current = setInterval(fetchMessages, 2500);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    const recipient = selectedNumber !== "__manual__" ? selectedNumber : to;
    if (!recipient) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, message: text }),
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

      {/* ── Phone number status ── */}
      {phoneStatus && (
        <section style={{ ...styles.card, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ ...styles.h2, margin: 0 }}>Phone Number Status</h2>
            <button onClick={fetchStatus} style={{ ...styles.button, padding: "4px 12px", fontSize: 12 }}>
              Refresh
            </button>
          </div>
          {phoneStatus.error ? (
            <span style={{ color: "#f66", fontSize: 13 }}>{JSON.stringify(phoneStatus.error)}</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <div><span style={styles.label2}>Number:</span> {phoneStatus.display_phone_number ?? "—"}</div>
              <div><span style={styles.label2}>Verified name:</span> {phoneStatus.verified_name ?? "—"}</div>
              <div>
                <span style={styles.label2}>Display name status:</span>{" "}
                <span style={{ color: nameStatusColor(phoneStatus.name_status), fontWeight: "bold" }}>
                  {phoneStatus.name_status ?? "—"}
                </span>
              </div>
              <div>
                <span style={styles.label2}>Quality rating:</span>{" "}
                <span style={{ color: qualityColor(phoneStatus.quality_rating) }}>
                  {phoneStatus.quality_rating ?? "—"}
                </span>
              </div>
              <div><span style={styles.label2}>Status:</span> {phoneStatus.status ?? "—"}</div>
            </div>
          )}
        </section>
      )}

      {/* ── Send form ── */}
      <section style={styles.card}>
        <h2 style={styles.h2}>Send Message</h2>
        <form onSubmit={handleSend} style={styles.form}>
          <label style={styles.label}>
            To
            <select
              style={styles.input}
              value={selectedNumber}
              onChange={(e) => {
                setSelectedNumber(e.target.value);
                if (e.target.value !== "__manual__") setTo(e.target.value);
                else setTo("");
              }}
            >
              {activeWindows.length === 0 && (
                <option value="__manual__">No open windows — enter manually</option>
              )}
              {activeWindows.map(({ number, label }) => (
                <option key={number} value={number}>{label}</option>
              ))}
              {activeWindows.length > 0 && (
                <option value="__manual__">Other (enter manually)</option>
              )}
            </select>
          </label>
          {selectedNumber === "__manual__" && (
            <label style={styles.label}>
              Phone number (with country code, no +)
              <input
                style={styles.input}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="15551234567"
                required
              />
            </label>
          )}
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
          <div style={{ ...styles.resultBox, borderColor: sendResult.body?.error ? "#f66" : "#4a4" }}>
            {sendResult.body?.error ? (
              <>
                <strong style={{ color: "#f66" }}>
                  Error {sendResult.body.error.code}
                  {sendResult.body.error.error_subcode ? ` (${sendResult.body.error.error_subcode})` : ""}
                  : {sendResult.body.error.message}
                </strong>
                <pre style={styles.pre}>{JSON.stringify(sendResult, null, 2)}</pre>
              </>
            ) : (
              <>
                <strong style={{ color: "#4a4" }}>Sent OK</strong>
                <pre style={styles.pre}>{JSON.stringify(sendResult, null, 2)}</pre>
              </>
            )}
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

        <div style={styles.msgFeed}>
          {messages.map((msg, i) => (
            <details key={msg.id ?? i} style={styles.msgCard}>
              <summary style={styles.msgSummary}>
                <span style={styles.msgMeta}>
                  <span><strong>From:</strong> {msg.from}</span>
                  <span><strong>Type:</strong> {msg.type}</span>
                  {msg.text && <span style={styles.msgPreview}>{msg.text}</span>}
                  {msg.replyError && <span style={styles.replyErrorBadge}>reply failed</span>}
                  <span style={styles.ts}>
                    {msg.receivedAt
                      ? new Date(Number(msg.receivedAt)).toLocaleTimeString()
                      : new Date(Number(msg.timestamp) * 1000).toLocaleTimeString()}
                  </span>
                </span>
              </summary>
              <div style={styles.msgBody}>
                {msg.text && <div style={styles.msgText}>{msg.text}</div>}
                {msg.replyError && (
                  <div style={styles.replyError}>
                    <strong>Auto-reply failed</strong>
                    {msg.replyError.code ? ` — code ${msg.replyError.code}: ` : ": "}
                    {msg.replyError.message ?? JSON.stringify(msg.replyError)}
                  </div>
                )}
                <pre style={styles.pre}>{JSON.stringify(msg.raw, null, 2)}</pre>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function nameStatusColor(status) {
  if (!status) return "#888";
  if (status === "APPROVED") return "#4a4";
  if (status === "AVAILABLE_WITHOUT_REVIEW") return "#4a4";
  if (status === "PENDING_REVIEW") return "#fa0";
  if (status === "DECLINED") return "#f66";
  return "#888";
}

function qualityColor(rating) {
  if (!rating) return "#888";
  if (rating === "GREEN") return "#4a4";
  if (rating === "YELLOW") return "#fa0";
  if (rating === "RED") return "#f66";
  return "#888";
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
  label2: { color: "#888", marginRight: 6 },
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
  msgFeed: {
    maxHeight: 480,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  msgCard: {
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    background: "#1a1a1a",
    cursor: "pointer",
  },
  msgSummary: {
    listStyle: "none",
    padding: "10px 12px",
    userSelect: "none",
  },
  msgMeta: {
    display: "flex",
    gap: 12,
    fontSize: 12,
    color: "#999",
    flexWrap: "wrap",
    alignItems: "center",
  },
  msgPreview: {
    color: "#ccc",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 180,
  },
  replyErrorBadge: {
    color: "#f66",
    fontSize: 11,
    border: "1px solid #f66",
    borderRadius: 3,
    padding: "1px 5px",
  },
  ts: { marginLeft: "auto" },
  msgBody: { padding: "0 12px 12px", borderTop: "1px solid #2a2a2a" },
  msgText: { fontSize: 14, color: "#e8e8e8", margin: "10px 0 6px" },
  replyError: { fontSize: 12, color: "#f66", marginBottom: 6, padding: "4px 8px", background: "#1a0000", borderRadius: 3 },
};
