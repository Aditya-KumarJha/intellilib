"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "ai" | "user";

type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
};

const AiSmartDiscovery = () => {
  const messages: ChatMessage[] = [
    {
      id: 1,
      role: "ai",
      text: "Hello! I can help you find books, track issues, and personalize recommendations.",
    },
    {
      id: 2,
      role: "user",
      text: "Find modern AI books available this week.",
    },
    {
      id: 3,
      role: "ai",
      text: "Done. I found 12 options with instant availability in your branch.",
    },
    {
      id: 4,
      role: "user",
      text: "Show me the top 3 with summaries.",
    },
    {
      id: 5,
      role: "ai",
      text: "Curated picks ready. Want to issue them now?",
    },
    {
      id: 6,
      role: "user",
      text: "Yes, issue the first one and save the rest.",
    },
    {
      id: 7,
      role: "ai",
      text: "All set. The first title is issued and the other two are on hold.",
    },
    {
      id: 8,
      role: "user",
      text: "Great, notify me when the holds are ready for pickup.",
    },
    {
      id: 9,
      role: "ai",
      text: "Done. I'll alert you the moment they arrive.",
    },
  ];

  const typingStepMs = 750;
  const messageStepMs = 1350;
  const loopPauseMs = 900;

  const chatSteps = useMemo(() => {
    return messages.flatMap((message, index) => {
      if (index === 0) {
        return [
          {
            id: `message-${message.id}`,
            type: "message",
            message,
          } as const,
        ];
      }

      return [
        {
          id: `typing-${message.id}`,
          type: "typing",
          role: message.role,
        } as const,
        {
          id: `message-${message.id}`,
          type: "message",
          message,
        } as const,
      ];
    });
  }, [messages]);

  const [chatStepIndex, setChatStepIndex] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const visibleChatEntries = useMemo(() => {
    const entries: Array<
      | { id: string; type: "typing"; role: ChatRole }
      | { id: string; type: "message"; message: ChatMessage }
    > = [];

    const currentSteps = chatSteps.slice(0, chatStepIndex + 1);
    currentSteps.forEach((step) => {
      if (step.type === "typing") {
        entries.push(step);
        return;
      }

      const lastEntry = entries[entries.length - 1];
      if (lastEntry?.type === "typing" && lastEntry.role === step.message.role) {
        entries.pop();
      }
      entries.push(step);
    });

    return entries;
  }, [chatSteps, chatStepIndex, messages]);

  useEffect(() => {
    const currentStep = chatSteps[chatStepIndex];
    if (!currentStep) return;

    const delay = currentStep.type === "typing" ? typingStepMs : messageStepMs;
    const timeout = window.setTimeout(() => {
      if (chatStepIndex >= chatSteps.length - 1) {
        window.setTimeout(() => setChatStepIndex(0), loopPauseMs);
      } else {
        setChatStepIndex((prev) => prev + 1);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [chatStepIndex, chatSteps, loopPauseMs, messageStepMs, typingStepMs]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [visibleChatEntries.length]);

  const results = [
    {
      id: 1,
      title: "Designing Intelligence",
      author: "R. Hayes",
      status: "Available",
      cover: "/images/heroSlider/book-2.jpeg",
    },
    {
      id: 2,
      title: "Human + Machine",
      author: "J. Park",
      status: "Issued",
      cover: "/images/heroSlider/book-5.jpeg",
    },
    {
      id: 3,
      title: "Future Patterns",
      author: "S. Cole",
      status: "Available",
      cover: "/images/heroSlider/book-8.jpg",
    },
  ];

  const miniGrid = [
    {
      id: 1,
      title: "Neural Horizons",
      cover: "/images/heroSlider/book-6.webp",
    },
    {
      id: 2,
      title: "The AI Archivist",
      cover: "/images/heroSlider/book-3.jpeg",
    },
    {
      id: 3,
      title: "Signal & Story",
      cover: "/images/heroSlider/book-9.jpg",
    },
  ];

  return (
    <section id="ai-assistant" className="relative py-8 overflow-hidden scroll-mt-24">
      <span id="smart-search" className="absolute -top-24" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-(--ai-section-bg)" />
      <div className="absolute -left-28 top-8 h-105 w-105 rounded-full bg-[radial-gradient(circle_at_center,var(--ai-glow-left),transparent_70%)] blur-3xl opacity-80" />
      <div className="absolute -right-28 top-16 h-105 w-105 rounded-full bg-[radial-gradient(circle_at_center,var(--ai-glow-right),transparent_70%)] blur-3xl opacity-80" />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="group relative">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,var(--ai-card-glow),transparent_65%)] opacity-40" />
            <div className="relative rounded-3xl border border-(--ai-card-border) bg-(--ai-card-bg) p-5 sm:p-8 shadow-[0_35px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition duration-500 ease-out group-hover:scale-[1.02] group-hover:shadow-[0_45px_140px_-70px_rgba(0,0,0,0.95)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-(--ai-badge-border) bg-(--ai-badge-bg) px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-(--ai-badge-text) shadow-[0_0_20px_rgba(124,58,237,0.45)] animate-ai-glow">
                <span className="text-base">✨</span>
                AI Powered
              </div>

              <div className="mt-6">
                <h2 className="font-semibold text-3xl sm:text-4xl text-(--ai-title-color)">
                  Talk to Your Library
                </h2>
                <p className="mt-3 text-sm sm:text-base text-(--ai-subtitle-color)">
                  A premium AI assistant that understands intent, context, and availability in seconds.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-(--ai-panel-border) bg-(--ai-panel-bg) p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="relative h-72 overflow-hidden">
                  <div
                    ref={chatScrollRef}
                    className="flex h-full flex-col gap-4 overflow-y-auto pr-1 sm:pr-2"
                  >
                    {visibleChatEntries.map((entry) => {
                      const role =
                        entry.type === "message" ? entry.message.role : entry.role;
                      const isUser = role === "user";

                      return (
                        <div
                          key={entry.id}
                          className={`flex ${isUser ? "justify-end" : "justify-start"} ai-chat-enter`}
                        >
                          {!isUser && (
                            <div className="mr-3 mt-1 h-9 w-9 rounded-full bg-[conic-gradient(from_120deg,var(--ai-accent),transparent_65%)] p-0.5 shadow-[0_0_18px_rgba(124,58,237,0.6)] animate-ai-pulse">
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-(--ai-card-bg) text-[11px] text-(--ai-title-color)">
                                AI
                              </div>
                            </div>
                          )}
                          {entry.type === "typing" ? (
                            <div
                              className={`flex items-center gap-2 rounded-2xl border border-(--ai-panel-border) px-4 py-2 ${
                                isUser
                                  ? "bg-white/80 text-neutral-900 dark:bg-white/10 dark:text-white"
                                  : "bg-(--ai-panel-bg)"
                              }`}
                            >
                              <span className="ai-typing-dot" style={{ animationDelay: "0ms" }} />
                              <span className="ai-typing-dot" style={{ animationDelay: "150ms" }} />
                              <span className="ai-typing-dot" style={{ animationDelay: "300ms" }} />
                            </div>
                          ) : (
                            <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                              {isUser && (
                                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/70 text-xs font-semibold text-neutral-800 shadow-[0_10px_25px_-12px_rgba(0,0,0,0.6)] dark:bg-white/10 dark:text-white">
                                  You
                                </div>
                              )}
                              <div
                                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg transition sm:max-w-[82%] lg:max-w-[78%] ${
                                  isUser
                                    ? "bg-white/80 text-neutral-900 dark:bg-white/10 dark:text-white"
                                    : "bg-[linear-gradient(135deg,rgba(15,15,25,0.85),rgba(74,29,125,0.55))] border border-(--ai-bubble-border) text-white/90"
                                }`}
                              >
                                {entry.message.text}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 group/input relative">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,var(--ai-input-glow),transparent_65%)] opacity-0 transition duration-500 group-hover/input:opacity-100" />
                <div className="relative flex items-center gap-3 rounded-full border border-(--ai-panel-border) bg-(--ai-panel-bg) px-5 py-2 backdrop-blur-xl transition duration-300 focus-within:border-(--ai-accent)">
                  <span className="text-xs uppercase tracking-[0.25em] text-(--ai-input-label)">Ask</span>
                  <div className="flex-1 text-sm text-(--ai-input-placeholder)">Type a request...</div>
                  <button className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,var(--ai-accent),rgba(59,130,246,0.9))] text-white shadow-[0_8px_25px_rgba(99,102,241,0.6)] transition duration-300 hover:scale-105 active:scale-95">
                    ➜
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top,var(--search-card-glow),transparent_65%)] opacity-40" />
            <div className="relative rounded-3xl border border-(--ai-card-border) bg-(--ai-card-bg) p-5 sm:p-8 shadow-[0_35px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition duration-500 ease-out group-hover:scale-[1.02] group-hover:shadow-[0_45px_140px_-70px_rgba(0,0,0,0.95)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-(--ai-badge-border) bg-(--ai-badge-bg) px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-(--ai-badge-text) shadow-[0_0_20px_rgba(59,130,246,0.45)] animate-ai-glow">
                <span className="text-base">⚡</span>
                Smart Search
              </div>

              <div className="mt-6">
                <h2 className="font-semibold text-3xl sm:text-4xl text-(--ai-title-color)">
                  Find Books Instantly
                </h2>
                <p className="mt-3 text-sm sm:text-base text-(--ai-subtitle-color)">
                  Lightning-fast discovery across branches, genres, and availability.
                </p>
              </div>

              <div className="mt-8">
                <div className="group/search relative">
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,var(--ai-search-glow),transparent_70%)] opacity-0 transition duration-300 group-focus-within/search:opacity-100" />
                  <div className="relative flex items-center gap-4 rounded-full border border-(--ai-panel-border) bg-(--ai-panel-bg) px-5 py-2 text-sm text-(--ai-input-text) transition duration-300 group-focus-within/search:scale-[1.02] group-focus-within/search:border-(--search-accent)">
                    <Search className="h-4 w-4 text-(--ai-icon-muted)" />
                    Search &quot;neural networks&quot;...
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-(--ai-panel-border) bg-(--ai-panel-bg) p-4 backdrop-blur-xl ai-fade-up" style={{ animationDelay: "200ms" }}>
                  <div className="space-y-3">
                    {results.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 transition duration-300 hover:-translate-y-0.5 hover:border-(--ai-row-border) hover:bg-(--ai-row-hover)"
                        style={{ animationDelay: `${200 + index * 120}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-9 overflow-hidden rounded-lg shadow-lg">
                            <Image
                              src={item.cover}
                              alt={item.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-(--ai-result-title)">{item.title}</p>
                            <p className="text-xs text-(--ai-result-subtitle)">{item.author}</p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            item.status === "Available"
                              ? "border-(--ai-status-available-border) bg-(--ai-status-available-bg) text-(--ai-status-available-text)"
                              : "border-(--ai-status-issued-border) bg-(--ai-status-issued-bg) text-(--ai-status-issued-text)"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  {miniGrid.map((book) => (
                    <div
                      key={book.id}
                      className="group/card perspective-[1000px]"
                    >
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_45px_-20px_rgba(0,0,0,0.8)] transition duration-300 ease-out group-hover/card:-translate-y-1 group-hover/card:shadow-[0_26px_70px_-30px_rgba(0,0,0,0.9)] group-hover/card:transform-[rotateX(4deg)_rotateY(-4deg)]">
                        <div className="relative h-28 w-full">
                          <Image
                            src={book.cover}
                            alt={book.title}
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/70 via-black/10 to-transparent p-3 opacity-0 transition duration-300 group-hover/card:opacity-100">
                          <p className="text-xs font-semibold text-white">{book.title}</p>
                          <button className="mt-2 w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">Issue Book</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiSmartDiscovery;
