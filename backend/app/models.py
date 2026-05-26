from __future__ import annotations

from pydantic import BaseModel
from datetime import datetime
from typing import Any


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceOut(BaseModel):
    id: str
    name: str
    owner_id: str
    created_at: datetime


class DocumentOut(BaseModel):
    id: str
    workspace_id: str
    file_name: str
    file_type: str
    file_url: str
    status: str
    created_at: datetime


class CsvTableOut(BaseModel):
    id: str
    document_id: str
    columns: list[dict[str, Any]]
    row_count: int
    preview_data: list[dict[str, Any]]
    created_at: datetime


class SessionCreate(BaseModel):
    title: str = "New Chat"


class SessionOut(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    title: str
    created_at: datetime


class MessageCreate(BaseModel):
    content: str


class Citation(BaseModel):
    type: str
    document_id: str
    file_name: str
    chunk_text: str | None = None
    page_number: int | None = None
    columns_used: list[str] | None = None
    aggregation: str | None = None


class ChartConfig(BaseModel):
    chart_type: str
    title: str
    x_label: str | None = None
    y_label: str | None = None
    data: list[dict[str, Any]]


class MessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: list[Citation]
    chart_config: ChartConfig | None
    created_at: datetime
