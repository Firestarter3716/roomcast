import { Monitor } from "lucide-react";

export default function DisplayNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        textAlign: "center",
      }}
    >
      <Monitor
        size={56}
        style={{ color: "#525252", marginBottom: "1.5rem" }}
      />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: 0,
          color: "#ffffff",
        }}
      >
        Display Not Found
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#737373",
          marginTop: "0.75rem",
          maxWidth: "20rem",
          lineHeight: 1.5,
        }}
      >
        The display token is invalid or has been deactivated.
      </p>
    </div>
  );
}
