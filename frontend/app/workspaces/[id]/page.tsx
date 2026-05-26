"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Workspace, Document, ChatSession } from "@/types";
import FileUploader from "@/components/FileUploader";
import DocumentList from "@/components/DocumentList";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeTab, setActiveTab] = useState<"documents" | "chat">("documents");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ws, docs, sess] = await Promise.all([
        apiFetch<Workspace>("GET", `/api/workspaces/${workspaceId}`),
        apiFetch<Document[]>("GET", `/api/workspaces/${workspaceId}/documents`),
        apiFetch<ChatSession[]>("GET", `/api/workspaces/${workspaceId}/sessions`),
      ]);
      setWorkspace(ws);
      setDocuments(docs);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSession() {
    const session = await apiFetch<ChatSession>("POST", `/api/workspaces/${workspaceId}/sessions`, {
      title: "New Chat",
    });
    router.push(`/workspaces/${workspaceId}/chat/${session.id}`);
  }

  function handleDocumentUploaded(doc: Document) {
    setDocuments((prev) => [doc, ...prev]);
  }

  function handleDocumentUpdated(updated: Document) {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleDocumentDeleted(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/workspaces")}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-semibold text-gray-900">{workspace?.name}</h1>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "documents"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            문서
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            채팅
          </button>
        </div>

        {activeTab === "documents" && (
          <div className="space-y-6">
            <FileUploader
              workspaceId={workspaceId}
              onUploaded={handleDocumentUploaded}
            />
            <DocumentList
              documents={documents}
              onUpdated={handleDocumentUpdated}
              onDeleted={handleDocumentDeleted}
            />
          </div>
        )}

        {activeTab === "chat" && (
          <div className="space-y-4">
            <button
              onClick={createSession}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 채팅
            </button>

            {sessions.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">채팅 세션이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/workspaces/${workspaceId}/chat/${s.id}`)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-blue-300 transition-all group flex items-center gap-3"
                  >
                    <MessageSquare className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
