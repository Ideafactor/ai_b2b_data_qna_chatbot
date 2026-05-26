"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, BarChart3 } from "lucide-react";
import type { Citation } from "@/types";

interface Props {
  citations: Citation[];
}

export default function CitationPanel({ citations }: Props) {
  const [open, setOpen] = useState(false);

  if (citations.length === 0) return null;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-xs font-medium text-gray-600"
      >
        <span>근거 보기 ({citations.length})</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {citations.map((c, i) => (
            <div key={i} className="px-3 py-2.5 bg-white">
              <div className="flex items-center gap-1.5 mb-1">
                {c.type === "csv" ? (
                  <BarChart3 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className="text-xs font-medium text-gray-700 truncate">{c.file_name}</span>
                {c.page_number && (
                  <span className="text-xs text-gray-400 shrink-0">p.{c.page_number}</span>
                )}
              </div>

              {c.type === "document" && c.chunk_text && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 pl-5">
                  {c.chunk_text}
                </p>
              )}

              {c.type === "csv" && c.columns_used && (
                <div className="pl-5 space-y-0.5">
                  <p className="text-xs text-gray-500">
                    컬럼: {c.columns_used.slice(0, 5).join(", ")}
                    {c.columns_used.length > 5 ? ` 외 ${c.columns_used.length - 5}개` : ""}
                  </p>
                  {c.aggregation && (
                    <p className="text-xs text-gray-400 truncate">조건: {c.aggregation}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
