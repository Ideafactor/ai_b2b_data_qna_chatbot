"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Database } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import type { Workspace } from "@/types";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    apiFetch<Workspace[]>("GET", "/api/workspaces")
      .then((data) => {
        if (isMounted) setWorkspaces(data);
      })
      .catch(() => {
        if (isMounted) setError("워크스페이스를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await apiFetch<Workspace>("POST", "/api/workspaces", { name: newName.trim() });
      setWorkspaces((prev) => [ws, ...prev]);
      setShowDialog(false);
      setNewName("");
    } catch {
      setError("워크스페이스 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Enterprise Data Chat</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-gray-900">내 워크스페이스</h1>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 워크스페이스
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20">
            <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">워크스페이스가 없습니다</p>
            <p className="text-gray-400 text-xs mt-1">새 워크스페이스를 만들어 시작하세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/workspaces/${ws.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {ws.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ws.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Database className="w-4 h-4 text-gray-300 group-hover:text-blue-400 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="font-semibold text-gray-900 mb-4">새 워크스페이스 만들기</h2>
            <form onSubmit={createWorkspace} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="워크스페이스 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDialog(false); setNewName(""); }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "생성 중..." : "만들기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
