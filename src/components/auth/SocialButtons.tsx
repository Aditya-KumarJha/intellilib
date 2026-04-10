"use client";

import { FaGoogle, FaGithub } from "react-icons/fa";

interface SocialButtonsProps {
  onClick: (provider: string) => void;
}

export default function SocialButtons({ onClick }: SocialButtonsProps) {
  const providers = [
    { name: "Google", icon: <FaGoogle /> },
    { name: "GitHub", icon: <FaGithub /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {providers.map((p) => (
        <button
          key={p.name}
          type="button"
          aria-label={`Sign up with ${p.name}`}
          onClick={() => onClick(p.name)}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-3 active:scale-95 shadow-sm"
          style={{
            border: "1px solid var(--ai-badge-border)",
            background: "var(--ai-badge-bg)",
            color: "var(--ai-badge-text)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(90deg, var(--ai-accent), var(--search-accent))";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--ai-badge-bg)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ai-badge-text)";
          }}
        >
          {p.icon} <span className="text-sm font-medium">{p.name}</span>
        </button>
      ))}
    </div>
  );
}