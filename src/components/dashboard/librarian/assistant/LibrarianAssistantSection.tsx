"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, SendHorizontal, Shield } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

type ChatRole = "librarian" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type UserChoiceItem = {
  id: string;
  full_name: string | null;
  email?: string | null;
  status?: string | null;
};

type BookChoiceItem = {
  id: number;
  title: string | null;
  author: string | null;
  available_copies: number | null;
  total_copies: number | null;
};

type AssistantChoices =
  | { type: "user"; action: string; amount?: number; items: UserChoiceItem[] }
  | { type: "book"; action: string; amount?: number; items: BookChoiceItem[] };

type AssistantReplyPayload = {
  reply?: string;
  replyType?: "choose_user" | "choose_book";
  action?: string;
  candidates?: UserChoiceItem[] | BookChoiceItem[];
  amount?: number;
  error?: string;
};

type AssistantActionPayload = {
  reply?: string;
  message?: string;
  error?: string;
};

const STARTER_PROMPTS = [
  "List low stock titles",
  "Show pending return requests",
  "Add 3 copies of Clean Code",
  "Remove 1 copy of Some Book",
  "Suspend user user_abc123",
  "Activate user user_abc123",
  "Which books have most copies?",
  "Show inventory overview",
];

const GENERIC_ASSISTANT_ERROR_MESSAGE = "Could not complete now. Please try later.";

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

function renderAssistantContent(content: string): ReactNode {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={`bullets-${key++}`} className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
        {bullets.map((item, idx) => (
          <li key={`item-${idx}`}>{item}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);

    if (bulletMatch) {
      bullets.push(bulletMatch[1]);
      continue;
    }

    flushBullets();

    if (!line.trim()) {
      nodes.push(<div key={`spacer-${key++}`} className="h-1" />);
      continue;
    }

    nodes.push(
      <p key={`line-${key++}`} className="text-[13px] leading-relaxed">
        {line}
      </p>,
    );
  }

  flushBullets();
  return <div className="space-y-1.5">{nodes}</div>;
}

export default function LibrarianAssistantSection() {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am the Librarian Assistant. You can manage inventory, view pending returns, process returns, and suspend/activate members.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [choices, setChoices] = useState<AssistantChoices | null>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function sendMessage(value: string) {
    const text = value.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "librarian", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await authedFetch("/api/librarian/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await res.json().catch(() => ({}))) as AssistantReplyPayload;

      if (!res.ok) {
        throw new Error(payload.error ?? "Assistant request failed");
      }

      if (payload.replyType === "choose_user") {
        setChoices({ type: "user", action: String(payload.action ?? ""), items: (payload.candidates ?? []) as UserChoiceItem[] });
        setMessages((prev) => [...prev, { role: "assistant", content: "Multiple users matched. Please select one from the list below." }]);
      } else if (payload.replyType === "choose_book") {
        setChoices({
          type: "book",
          action: String(payload.action ?? ""),
          amount: payload.amount,
          items: (payload.candidates ?? []) as BookChoiceItem[],
        });
        setMessages((prev) => [...prev, { role: "assistant", content: "Multiple books matched. Please select one from the list below." }]);
      } else {
        const reply = payload.reply ?? "I could not generate a response right now.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (error: unknown) {
      console.error("Assistant request failed:", error);
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

  async function performChoice(action: string, targetId: string | number, amount?: number) {
    setSending(true);
    try {
      const res = await authedFetch("/api/librarian/assistant/action", {
        method: "POST",
        body: JSON.stringify({ action, targetId, amount }),
      });

      const payload = (await res.json().catch(() => ({}))) as AssistantActionPayload;
      if (!res.ok) {
        throw new Error(payload.error ?? "Action failed");
      }

      const message = payload.reply ?? payload.message ?? "Action completed.";
      setMessages((prev) => [...prev, { role: "assistant", content: String(message) }]);
    } catch (err) {
      console.error("Action failed", err);
      setMessages((prev) => [...prev, { role: "assistant", content: GENERIC_ASSISTANT_ERROR_MESSAGE }]);
    } finally {
      setChoices(null);
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="max-w-6xl rounded-3xl border border-black/10 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Shield className="h-3.5 w-3.5" />
              Librarian Desk
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Librarian AI Assistant</h2>
            <p className="mt-1 text-sm text-foreground/65">Manage inventory, returns, and member status using natural language.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium text-foreground/70 dark:border-white/10 dark:bg-white/10">
            <Bot className="h-4 w-4" />
            AI Powered
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
          <div ref={messagesContainerRef} className="max-h-105 space-y-3 overflow-y-auto px-1 py-1">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "librarian" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "librarian"
                      ? "bg-amber-600 text-white"
                      : "border border-black/10 bg-white text-foreground dark:border-white/10 dark:bg-white/10"
                  }`}
                >
                  {message.role === "assistant" ? renderAssistantContent(message.content) : message.content}
                </div>
              </div>
            ))}

            {choices ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {choices.type === "user" ? (
                  (choices.items as UserChoiceItem[]).map((user) => (
                    <div key={String(user.id)} className="rounded-lg border p-3 bg-white/90 dark:bg-black/20">
                      <div className="font-semibold">{user.full_name}</div>
                      <div className="text-xs text-foreground/60">ID: {user.id}</div>
                      {user.email ? <div className="text-xs text-foreground/60">{user.email}</div> : null}
                      <div className="mt-2 flex gap-2">
                        <button
                          className="rounded px-3 py-1 bg-amber-600 text-white text-sm"
                          onClick={() => void performChoice(choices.action, user.id)}
                        >
                          {choices.action.replace(/_/g, " ")}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  (choices.items as BookChoiceItem[]).map((book) => (
                    <div key={String(book.id)} className="rounded-lg border p-3 bg-white/90 dark:bg-black/20">
                      <div className="font-semibold">{book.title ?? ""}</div>
                      <div className="text-xs text-foreground/60">ID: {book.id}</div>
                      <div className="text-xs text-foreground/60">{book.author ?? ""}</div>
                      <div className="text-xs text-foreground/60">{book.available_copies ?? 0}/{book.total_copies ?? 0}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          className="rounded px-3 py-1 bg-amber-600 text-white text-sm"
                          onClick={() => void performChoice(choices.action, book.id, choices.amount)}
                        >
                          {choices.action.replace(/_/g, " ")}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-foreground/70 dark:border-white/10 dark:bg-white/10">Thinking...</div>
              </div>
            ) : null}
          </div>

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
              placeholder="Type a command — e.g. Add 3 copies of Clean Code or Suspend user user_abc123"
              className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm text-foreground outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-white/10"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
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
