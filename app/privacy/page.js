export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Privacy Policy</h1>
      <p style={styles.meta}>Last updated: {new Date().getFullYear()}</p>

      <p>This is a private testing tool for the WhatsApp Cloud API. It is not a public service.</p>

      <h2 style={styles.h2}>Data Collection</h2>
      <p>This app receives and temporarily stores WhatsApp messages sent to a test phone number for development and debugging purposes. No data is shared with third parties.</p>

      <h2 style={styles.h2}>Data Retention</h2>
      <p>Messages are stored only for testing purposes and are not retained long-term.</p>

      <h2 style={styles.h2}>Contact</h2>
      <p>For any questions, contact the app owner directly.</p>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "sans-serif",
    maxWidth: 600,
    margin: "0 auto",
    padding: "40px 20px",
    lineHeight: 1.6,
    color: "#333",
  },
  h1: { fontSize: 24, marginBottom: 4 },
  h2: { fontSize: 18, marginTop: 32 },
  meta: { color: "#888", fontSize: 13, marginBottom: 24 },
};
