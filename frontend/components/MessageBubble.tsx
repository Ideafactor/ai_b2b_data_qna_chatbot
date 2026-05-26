"use client";

import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/types";
import CitationPanel from "./CitationPanel";
import ChartRenderer from "./ChartRenderer";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const isLoading = message.content === "";

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800">
          {isLoading ? (
            <div className="flex gap-1 items-center h-5">
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isLoading && message.citations.length > 0 && (
          <CitationPanel citations={message.citations} />
        )}

        {!isLoading && message.chart_config && (
          <ChartRenderer config={message.chart_config} />
        )}
      </div>
    </div>
  );
}
