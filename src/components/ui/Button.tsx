"use client";

import { ReactNode, useRef } from "react";

type ButtonProps = {
  text: string;
  icon?: ReactNode;
  textColor?: string;
  bgColor?: string;
};

export default function Button({
  text,
  icon,
  textColor = "text-white",
  bgColor = "bg-gradient-to-b from-zinc-300 to-zinc-400",
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const btn = ref.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const offsetX = (x - centerX) / 6;
    const offsetY = (y - centerY) / 4;

    btn.style.boxShadow = `
      inset ${-offsetX}px ${-offsetY}px 6px rgba(255,255,255,0.6),
      inset ${offsetX}px ${offsetY}px 6px rgba(0,0,0,0.25),
      ${offsetX * 2}px ${offsetY * 2}px 20px rgba(255,255,255,0.15),
      ${offsetX * 3}px ${offsetY * 3}px 40px rgba(0,0,0,0.6)
    `;
  };

  const resetShadow = () => {
    const btn = ref.current;
    if (!btn) return;

    btn.style.boxShadow = `
      inset 0 -2px 4px rgba(0,0,0,0.3),
      inset 0 2px 4px rgba(255,255,255,0.5),
      0 15px 20px -10px rgba(255,255,255,0.2),
      0 30px 40px rgba(0,0,0,0.6)
    `;
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetShadow}
      className={`
        ${bgColor} ${textColor}
        px-5 py-2 rounded-full font-medium
        flex items-center gap-2
        transition-all duration-200
      `}
      style={{
        boxShadow: `
          inset 0 -2px 4px rgba(0,0,0,0.3),
          inset 0 2px 4px rgba(255,255,255,0.5),
          0 15px 20px -10px rgba(255,255,255,0.2),
          0 30px 40px rgba(0,0,0,0.6)
        `,
      }}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}
