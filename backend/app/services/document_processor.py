from __future__ import annotations

import io
import re
import fitz
import pandas as pd
import tiktoken
import markdown as md_lib
from openai import OpenAI
from app.db.supabase_client import get_supabase
from app.config import settings

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 50

_enc = tiktoken.get_encoding("cl100k_base")
_openai_client: OpenAI | None = None


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def chunk_text(text: str) -> list[str]:
    tokens = _enc.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunks.append(_enc.decode(tokens[start:end]))
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    client = _get_openai()
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=chunks)
    return [item.embedding for item in response.data]


def parse_pdf(content: bytes) -> list[tuple[str, int]]:
    results = []
    with fitz.open(stream=content, filetype="pdf") as doc:
        for i, page in enumerate(doc):
            text = page.get_text()
            if text.strip():
                results.append((text, i + 1))
    return results


def parse_markdown(content: bytes) -> list[tuple[str, int]]:
    text = content.decode("utf-8", errors="replace")
    html = md_lib.markdown(text)
    plain = re.sub(r"<[^>]+>", "", html)
    return [(plain, 1)]


def _embed_and_store(document_id: str, pages: list[tuple[str, int]], db) -> None:
    all_chunks: list[tuple[str, int]] = []
    for text, page_num in pages:
        for chunk in chunk_text(text):
            if chunk.strip():
                all_chunks.append((chunk, page_num))

    if not all_chunks:
        return

    texts = [c[0] for c in all_chunks]
    embeddings = embed_chunks(texts)

    rows = [
        {
            "document_id": document_id,
            "chunk_text": all_chunks[i][0],
            "embedding": embeddings[i],
            "page_number": all_chunks[i][1],
            "metadata": {},
        }
        for i in range(len(all_chunks))
    ]

    for i in range(0, len(rows), BATCH_SIZE):
        db.table("document_chunks").insert(rows[i : i + BATCH_SIZE]).execute()


def _process_csv(document_id: str, content: bytes, db) -> None:
    df = pd.read_csv(io.BytesIO(content))
    columns = [
        {
            "name": col,
            "dtype": str(df[col].dtype),
            "sample": df[col].dropna().head(3).tolist(),
        }
        for col in df.columns
    ]
    preview = df.head(10).fillna("").to_dict(orient="records")

    db.table("csv_tables").insert({
        "document_id": document_id,
        "columns": columns,
        "row_count": len(df),
        "preview_data": preview,
    }).execute()

    summary = (
        f"CSV file with {len(df)} rows and {len(df.columns)} columns.\n"
        f"Columns: {', '.join(df.columns)}\n\n"
        f"Sample data:\n{df.head(20).to_string(index=False)}"
    )
    _embed_and_store(document_id, [(summary, 1)], db)


def process_document(document_id: str, file_type: str, content: bytes) -> None:
    db = get_supabase()
    try:
        if file_type == "csv":
            _process_csv(document_id, content, db)
        elif file_type == "pdf":
            pages = parse_pdf(content)
            _embed_and_store(document_id, pages, db)
        elif file_type == "md":
            pages = parse_markdown(content)
            _embed_and_store(document_id, pages, db)
        db.table("documents").update({"status": "ready"}).eq("id", document_id).execute()
    except Exception as e:
        db.table("documents").update({"status": "error"}).eq("id", document_id).execute()
        raise
