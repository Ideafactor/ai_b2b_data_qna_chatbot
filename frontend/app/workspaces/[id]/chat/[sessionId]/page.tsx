"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ChatMessage } from "@/types";
import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const workspaceId = params.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    try {
      const data = await apiFetch<ChatMessage[]>("GET", `/api/sessions/${sessionId}/messages`);
      setMessages(data);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function handleSend(content: string) {
    const userMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content,
      citations: [],
      chart_config: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistant = await apiFetch<ChatMessage>("POST", `/api/sessions/${sessionId}/messages`, {
      content,
    });
    setMessages((prev) => [...prev.slice(0, -1), userMsg, assistant]);
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push(`/workspaces/${workspaceId}`)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-semibold text-gray-900 text-sm">채팅</h1>
      </header>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            로딩 중...
          </div>
        ) : (
          <ChatInterface messages={messages} onSend={handleSend} />
        )}
      </div>
    </div>
  );
}
