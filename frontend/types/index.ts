export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  status: "processing" | "ready" | "error";
  created_at: string;
}

export interface ChatSession {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Citation {
  type: "document" | "csv";
  document_id: string;
  file_name: string;
  chunk_text?: string;
  page_number?: number;
  columns_used?: string[];
  aggregation?: string;
}

export interface ChartConfig {
  chart_type: "bar" | "line" | "pie" | "table" | "histogram";
  title: string;
  x_label?: string;
  y_label?: string;
  data: Record<string, unknown>[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  chart_config: ChartConfig | null;
  created_at: string;
}
