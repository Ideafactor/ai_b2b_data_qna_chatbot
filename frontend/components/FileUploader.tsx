"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { apiUpload, apiFetch } from "@/lib/api";
import type { Document } from "@/types";

interface Props {
  workspaceId: string;
  onUploaded: (doc: Document) => void;
}

const ACCEPT = ".pdf,.csv,.md,.markdown";

export default function FileUploader({ workspaceId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  function startPolling(docId: string) {
    pollRefs.current[docId] = setInterval(async () => {
      try {
        const docs = await apiFetch<Document[]>(
          "GET",
          `/api/workspaces/${workspaceId}/documents`
        );
        const updated = docs.find((d) => d.id === docId);
        if (updated && (updated.status === "ready" || updated.status === "error")) {
          clearInterval(pollRefs.current[docId]);
          delete pollRefs.current[docId];
          onUploaded(updated);
        }
      } catch {
        clearInterval(pollRefs.current[docId]);
      }
    }, 3000);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const doc = await apiUpload<Document>(
          `/api/workspaces/${workspaceId}/documents`,
          file
        );
        onUploaded(doc);
        startPolling(doc.id);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
        ) : (
          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        )}
        <p className="text-sm font-medium text-gray-600">
          {uploading ? "업로드 중..." : "파일을 드래그하거나 클릭하여 업로드"}
        </p>
        <p className="text-xs text-gray-400 mt-1">CSV, PDF, Markdown 지원</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
