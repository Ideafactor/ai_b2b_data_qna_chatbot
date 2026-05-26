"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "@/types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  onSend: (content: string) => Promise<void>;
}

const LOADING_MSG: ChatMessage = {
  id: "loading",
  session_id: "",
  role: "assistant",
  content: "",
  citations: [],
  chart_config: null,
  created_at: new Date().toISOString(),
};

export default function ChatInterface({ messages, onSend }: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    try {
      await onSend(content);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const displayMessages = sending
    ? [...messages, LOADING_MSG]
    : messages;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {displayMessages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-20">
            문서에 대해 자유롭게 질문해보세요
          </div>
        )}
        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="질문을 입력하세요... (Shift+Enter: 줄바꿈)"
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 bg-blue-600 text-white rounded-xl p-2.5 hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
