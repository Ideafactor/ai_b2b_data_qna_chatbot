from __future__ import annotations

import httpx
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.db.supabase_client import get_supabase
from app.services.csv_analyzer import analyze_csv
from app.config import settings

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"

_openai_client: OpenAI | None = None


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _embed_query(text: str) -> list[float]:
    client = _get_openai()
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=[text])
    return response.data[0].embedding


def _classify_question(question: str) -> str:
    llm = ChatOpenAI(model=CHAT_MODEL, temperature=0, openai_api_key=settings.OPENAI_API_KEY)
    prompt = (
        "Classify this question as either 'csv' (numeric analysis, aggregation, statistics, trends) "
        "or 'document' (text-based, policy, procedure, description).\n"
        f"Question: {question}\n"
        "Answer with only 'csv' or 'document'."
    )
    result = llm.invoke(prompt)
    answer = result.content.strip().lower()
    return "csv" if "csv" in answer else "document"


def _answer_document_question(question: str, workspace_id: str) -> dict:
    db = get_supabase()
    embedding = _embed_query(question)

    chunks = db.rpc(
        "match_chunks",
        {
            "query_embedding": embedding,
            "workspace_filter": workspace_id,
            "match_count": 5,
        },
    ).execute()

    if not chunks.data:
        return {
            "answer": "업로드된 문서에서 관련 정보를 찾을 수 없습니다.",
            "citations": [],
            "chart_config": None,
        }

    doc_cache: dict[str, str] = {}
    context_parts: list[str] = []
    citations: list[dict] = []

    for chunk in chunks.data:
        context_parts.append(chunk["chunk_text"])
        doc_id = chunk["document_id"]
        if doc_id not in doc_cache:
            doc_row = db.table("documents").select("file_name").eq("id", doc_id).execute()
            doc_cache[doc_id] = doc_row.data[0]["file_name"] if doc_row.data else "Unknown"
        citations.append({
            "type": "document",
            "document_id": doc_id,
            "file_name": doc_cache[doc_id],
            "chunk_text": chunk["chunk_text"][:300],
            "page_number": chunk.get("page_number"),
        })

    context = "\n\n---\n\n".join(context_parts)
    llm = ChatOpenAI(model=CHAT_MODEL, temperature=0, openai_api_key=settings.OPENAI_API_KEY)
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an enterprise data assistant. Answer the user's question using ONLY the provided context. "
            "Be concise and factual. If the context does not contain the answer, say so clearly.\n\n"
            "Context:\n{context}",
        ),
        ("human", "{question}"),
    ])
    chain = prompt | llm
    result = chain.invoke({"context": context, "question": question})

    return {
        "answer": result.content,
        "citations": citations,
        "chart_config": None,
    }


def _answer_csv_question(question: str, workspace_id: str) -> dict:
    db = get_supabase()

    docs = (
        db.table("documents")
        .select("id, file_name, file_url")
        .eq("workspace_id", workspace_id)
        .eq("file_type", "csv")
        .eq("status", "ready")
        .execute()
    )
    if not docs.data:
        return {
            "answer": "이 워크스페이스에 분석 가능한 CSV 파일이 없습니다.",
            "citations": [],
            "chart_config": None,
        }

    embedding = _embed_query(question)
    chunks = db.rpc(
        "match_chunks",
        {
            "query_embedding": embedding,
            "workspace_filter": workspace_id,
            "match_count": 3,
        },
    ).execute()

    csv_doc = None
    for chunk in (chunks.data or []):
        match = next((d for d in docs.data if d["id"] == chunk["document_id"]), None)
        if match:
            csv_doc = match
            break
    if csv_doc is None:
        csv_doc = docs.data[0]

    try:
        response = httpx.get(csv_doc["file_url"], timeout=30)
        response.raise_for_status()
        csv_bytes = response.content
    except Exception as e:
        return {
            "answer": f"CSV 파일을 불러오는 중 오류가 발생했습니다: {e}",
            "citations": [],
            "chart_config": None,
        }

    csv_meta = (
        db.table("csv_tables")
        .select("columns")
        .eq("document_id", csv_doc["id"])
        .execute()
    )
    columns = csv_meta.data[0]["columns"] if csv_meta.data else []

    analysis = analyze_csv(question, csv_bytes, columns)

    citations = [{
        "type": "csv",
        "document_id": csv_doc["id"],
        "file_name": csv_doc["file_name"],
        "columns_used": analysis.get("columns_used", []),
        "aggregation": question[:100],
    }]

    return {
        "answer": analysis["answer"],
        "citations": citations,
        "chart_config": analysis.get("chart_config"),
    }


def answer_question(question: str, workspace_id: str) -> dict:
    question_type = _classify_question(question)
    if question_type == "csv":
        return _answer_csv_question(question, workspace_id)
    return _answer_document_question(question, workspace_id)
