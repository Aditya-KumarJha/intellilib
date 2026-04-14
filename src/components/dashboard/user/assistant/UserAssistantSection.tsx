"use client";

import { useMemo, useState } from "react";
import { Bot, SendHorizontal, Sparkles } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { dashboardHref } from "@/lib/dashboardNav";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const STARTER_PROMPTS = [
  "Do we have clean code book?",
  "Check availability for designing data intensive applications",
  "Issue clean code",
  "Reserve clean architecture",
  "Show my active loans",
];

const GENERIC_ASSISTANT_ERROR_MESSAGE = "I could not complete that request right now. Please try again in a moment.";

async function authedFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export default function UserAssistantSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am your IntelliLib Assistant. Ask me about books, availability, issue or reservation actions, and your active loans.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function sendMessage(value: string) {
    const text = value.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await authedFetch("/api/library/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };

      if (!res.ok) {
        throw new Error(GENERIC_ASSISTANT_ERROR_MESSAGE);
      }

      const reply = payload.reply ?? "I could not generate a response right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setError(GENERIC_ASSISTANT_ERROR_MESSAGE);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: GENERIC_ASSISTANT_ERROR_MESSAGE,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <section className="max-w-6xl rounded-3xl border border-black/10 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Live Library Agent
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">AI Assistant</h2>
            <p className="mt-1 text-sm text-foreground/65">
              Ask in natural language about catalog, availability, issue, reservation, and your active loans.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium text-foreground/70 dark:border-white/10 dark:bg-white/10">
            <Bot className="h-4 w-4" />
            Gemini + LangGraph
          </span>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => {
                void sendMessage(prompt);
              }}
              className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-left text-xs text-foreground/80 transition hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-black/10 bg-white/75 p-3 dark:border-white/10 dark:bg-black/20">
          <div className="max-h-105 space-y-3 overflow-y-auto px-1 py-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-cyan-600 text-white"
                      : "border border-black/10 bg-white text-foreground dark:border-white/10 dark:bg-white/10"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-foreground/70 dark:border-white/10 dark:bg-white/10">
                  Thinking...
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about books, availability, issue, reservation..."
              className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm text-foreground outline-none transition focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/10"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
