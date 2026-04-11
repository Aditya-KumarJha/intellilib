import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#0b0b14",
          color: "#ffffff",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-20%",
            background:
              "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.35), transparent 45%), radial-gradient(circle at 80% 30%, rgba(139,92,246,0.35), transparent 45%), radial-gradient(circle at 50% 80%, rgba(45,212,191,0.25), transparent 45%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", gap: "16px" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            IntelliLib
          </div>
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 24,
            fontSize: 34,
            fontWeight: 500,
            color: "#d1d5f0",
            maxWidth: 900,
          }}
        >
          AI-Powered Smart Library Management System
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 24,
            fontSize: 22,
            color: "#9ca3af",
            maxWidth: 900,
          }}
        >
          Real-time tracking, AI discovery, digital fines, and analytics dashboards for modern libraries.
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 36,
            display: "flex",
            gap: "16px",
          }}
        >
          <span
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              backgroundColor: "rgba(56,189,248,0.18)",
              color: "#bae6fd",
              fontSize: 18,
            }}
          >
            AI Assistant
          </span>
          <span
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              backgroundColor: "rgba(139,92,246,0.18)",
              color: "#ddd6fe",
              fontSize: 18,
            }}
          >
            Realtime Sync
          </span>
          <span
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              backgroundColor: "rgba(45,212,191,0.18)",
              color: "#99f6e4",
              fontSize: 18,
            }}
          >
            Digital Payments
          </span>
        </div>
      </div>
    ),
    size
  );
}
