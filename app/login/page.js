"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/");
    } else {
      setError("Wrong password");
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <h1 style={styles.h1}>WhatsApp API Tester</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "..." : "Login"}
          </button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#0d0d0d",
    fontFamily: "monospace",
  },
  box: {
    border: "1px solid #333",
    borderRadius: 8,
    padding: "32px 28px",
    background: "#161616",
    width: 300,
  },
  h1: { fontSize: 16, color: "#25d366", marginBottom: 20, textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    background: "#222",
    border: "1px solid #444",
    borderRadius: 4,
    color: "#e8e8e8",
    padding: "10px 12px",
    fontFamily: "monospace",
    fontSize: 14,
    outline: "none",
  },
  button: {
    background: "#25d366",
    color: "#000",
    border: "none",
    borderRadius: 4,
    padding: "10px",
    fontFamily: "monospace",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
  },
  error: { color: "#f66", fontSize: 13, marginTop: 10, textAlign: "center" },
};
