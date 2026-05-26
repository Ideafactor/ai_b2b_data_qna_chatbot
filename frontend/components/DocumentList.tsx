"use client";

import { Trash2, FileText, BarChart3, FileCode, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Document } from "@/types";

interface Props {
  documents: Document[];
  onUpdated: (doc: Document) => void;
  onDeleted: (id: string) => void;
}

const icons: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4 text-red-500" />,
  csv: <BarChart3 className="w-4 h-4 text-green-500" />,
  md: <FileCode className="w-4 h-4 text-blue-500" />,
};

const statusBadge: Record<string, React.ReactNode> = {
  processing: (
    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      <Loader2 className="w-3 h-3 animate-spin" /> 처리 중
    </span>
  ),
  ready: (
    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> 완료
    </span>
  ),
  error: (
    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> 오류
    </span>
  ),
};

export default function DocumentList({ documents, onDeleted }: Props) {
  async function handleDelete(id: string) {
    if (!confirm("이 문서를 삭제하시겠습니까?")) return;
    await apiFetch("DELETE", `/api/documents/${id}`);
    onDeleted(id);
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        업로드된 문서가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <div className="shrink-0">{icons[doc.file_type] ?? <FileText className="w-4 h-4 text-gray-400" />}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{doc.file_name}</p>
            <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString("ko-KR")}</p>
          </div>
          <div className="shrink-0">{statusBadge[doc.status]}</div>
          <button
            onClick={() => handleDelete(doc.id)}
            className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
